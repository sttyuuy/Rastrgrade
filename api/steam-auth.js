/**
 * Steam OpenID авторизація → Firebase Auth custom token (uid = steamId).
 * ТАКОЖ: отримує нік та аватар зі Steam API і зберігає в Firestore.
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { isValidSteamId } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

const SITE_URL = process.env.SITE_URL || 'https://rastrgrade.vercel.app';
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const STEAM_OPENID = 'https://steamcommunity.com/openid/login';

function buildReturnTo() {
    const host = new URL(SITE_URL).host;
    return `https://${host}/api/steam-auth`;
}

async function getSteamProfile(steamId) {
    if (!STEAM_API_KEY) return null;
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(STEAM_API_KEY)}&steamids=${encodeURIComponent(steamId)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const player = data && data.response && data.response.players && data.response.players[0];
        if (!player) return null;
        return {
            personaName: player.personaname || null,
            avatar: player.avatarfull || player.avatarmedium || player.avatar || null,
        };
    } catch (e) {
        console.error('[steam-auth] profile error:', e.message);
        return null;
    }
}

module.exports = async (req, res) => {
    const ip = getClientIp(req);

    if (!checkRateLimit(`steam-auth:${ip}`, 20, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const returnTo = buildReturnTo();
    const realm = SITE_URL;

    // Крок 1: редірект на Steam
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

    // Крок 2: перевірка підпису
    if (req.query['openid.mode'] !== 'id_res') {
        return res.status(400).json({ error: 'Invalid OpenID mode' });
    }

    try {
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

        const claimedId = String(req.query['openid.claimed_id'] || '');
        const match = claimedId.match(/\/id\/(\d{17})$/);
        if (!match) {
            return res.status(400).json({ error: 'Invalid claimed_id' });
        }

        const steamId = match[1];
        if (!isValidSteamId(steamId)) {
            return res.status(400).json({ error: 'Invalid SteamID' });
        }

        // === ОТРИМУЄМО НІК І АВАТАР ЗІ STEAM API ===
        const profile = await getSteamProfile(steamId);

        // Створюємо/оновлюємо користувача
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            const newUser = {
                steamId,
                createdAt: Date.now(),
                balance: 5,
                inventory: [],
                totalWon: 0,
                totalLost: 0,
                totalSold: 0,
                profit: 0,
                upgrades: 0,
                purchases: 0,
                housePlayerLost: 0,
                houseCasinoWon: 0,
                bestDrop: null,
                bestUpgrade: null,
                xp: 0,
                level: 1,
            };
            if (profile) {
                newUser.displayName = profile.personaName;
                newUser.photoURL = profile.avatar;
            }
            await userRef.set(newUser);
        } else {
            // Існуючий — оновлюємо нік і аватар
            if (profile) {
                await userRef.update({
                    displayName: profile.personaName,
                    photoURL: profile.avatar,
                    lastLogin: Date.now(),
                });
            }
        }

        // ВАРІАНТ B: створюємо Firebase custom token з uid = steamId
        const customToken = await getAuth().createCustomToken(steamId);

        return res.redirect(
            `${SITE_URL}/?token=${encodeURIComponent(customToken)}`
        );
    } catch (e) {
        console.error('[steam-auth] error:', e.message);
        return res.status(500).json({ error: 'Internal error' });
    }
};
