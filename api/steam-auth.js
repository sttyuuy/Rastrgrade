/**
 * Steam OpenID авторизація
 */
const { getFirestore } = require('../lib/firebase-admin');
const { isValidSteamId } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

const SITE_URL = process.env.SITE_URL || 'https://rastrgrade.vercel.app';
const STEAM_OPENID = 'https://steamcommunity.com/openid/login';

function buildReturnTo() {
    // Захардкоджений host — не беремо з req.headers.host (захист від Host header injection)
    const host = new URL(SITE_URL).host;
    return `https://${host}/api/steam-auth`;
}

module.exports = async (req, res) => {
    const ip = getClientIp(req);

    if (!checkRateLimit(`steam-auth:${ip}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const returnTo = buildReturnTo();
    const realm = SITE_URL;

    // Крок 1: редірект на Steam OpenID
    if (!req.query['openid.mode']) {
        const params = new URLSearchParams({
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.mode': 'checkid_setup',
            'openid.return_to': returnTo,
            'openid.realm': realm,
            'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
            'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
        });
        return res.redirect(`${STEAM_OPENID}?${params.toString()}`);
    }

    // Крок 2: перевірка відповіді від Steam
    if (req.query['openid.mode'] !== 'id_res') {
        return res.status(400).json({ error: 'Invalid OpenID mode' });
    }

    try {
        // Перевіряємо підпис у Steam
        const verifyParams = new URLSearchParams();
        for (const [key, value] of Object.entries(req.query)) {
            if (key.startsWith('openid.')) {
                verifyParams.append(key, String(value));
            }
        }
        verifyParams.set('openid.mode', 'check_authentication');

        const verifyRes = await fetch(STEAM_OPENID, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyParams.toString(),
        });

        const verifyText = await verifyRes.text();
        if (!verifyText.includes('is_valid:true')) {
            return res.status(401).json({ error: 'Steam auth failed' });
        }

        // Витягуємо SteamID64
        const claimedId = String(req.query['openid.claimed_id'] || '');
        const match = claimedId.match(/\/id\/(\d{17})$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid claimed_id' });
        }

        const steamId = match[1];
        if (!isValidSteamId(steamId)) {
            return res.status(400).json({ error: 'Invalid SteamID' });
        }

        // Створюємо/оновлюємо користувача у Firestore
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            await userRef.set({
                steamId,
                createdAt: new Date(),
                balance: 0,
                totalWon: 0,
                totalSold: 0,
                inventory: [],
            });
        }

        // Редірект на фронтенд зі steamId (фронт далі використає Firebase Auth або власний токен)
        return res.redirect(`${SITE_URL}/?steamId=${encodeURIComponent(steamId)}`);
    } catch (e) {
        console.error('[steam-auth] error:', e.message);
        return res.status(500).json({ error: 'Internal error' });
    }
};
