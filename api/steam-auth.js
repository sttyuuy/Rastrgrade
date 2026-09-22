const { getFirestore, getAuth } = require('../lib/firebase-admin');
const {
    getSteamProfile,
    verifySteamOpenId,
    extractSteamIdFromClaimedId
} = require('../lib/steam');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const SITE_URL = 'https://rastrgrade.vercel.app';

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
        const { query } = req;
        const host = req.headers.host;
        const returnTo = `https://${host}${req.url.split('?')[0]}`;

        // 1. Редірект на Steam
        if (!query['openid.mode']) {
            const realm = `https://${host}`;
            const redirectUrl =
                'https://steamcommunity.com/openid/login' +
                '?openid.ns=http://specs.openid.net/auth/2.0' +
                '&openid.mode=checkid_setup' +
                `&openid.return_to=${encodeURIComponent(returnTo)}` +
                `&openid.realm=${encodeURIComponent(realm)}` +
                '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
                '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';

            return res.redirect(redirectUrl);
        }

        // 2. Перевірка підпису
        const isValid = await verifySteamOpenId(query);
        if (!isValid) {
            console.error('=== INVALID STEAM SIGNATURE ===');
            return res.status(401).send('Invalid Steam signature');
        }

        // 3. Витягуємо SteamID
        const steamId = extractSteamIdFromClaimedId(query['openid.claimed_id']);
        if (!steamId) {
            return res.status(400).send('SteamID not found');
        }

        // 4. Профіль
        const profile = await getSteamProfile(steamId);

        // 5. Firestore
        try {
            const db = getFirestore();
            const userRef = db.collection('users').doc(steamId);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
                await userRef.set({
                    steamId: steamId,
                    displayName: profile.personaname,
                    photoURL: profile.avatarfull,
                    balance: 5,
                    inventory: [],
                    profit: 0,
                    totalWon: 0,
                    totalLost: 0,
                    upgrades: 0,
                    purchases: 0,
                    bestDrop: null,
                    bestUpgrade: null,
                    housePlayerLost: 0,
                    houseCasinoWon: 0,
                    xp: 0,
                    level: 1,
                    soundOn: true,
                    shopFilter: 'all',
                    shopSort: 'price-asc',
                    spinSpeed: 'slow',
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                });
            } else {
                await userRef.update({
                    displayName: profile.personaname,
                    photoURL: profile.avatarfull,
                    updatedAt: Date.now()
                });
            }
        } catch (e) {
            console.error('=== FIRESTORE ERROR:', e.message, '===');
        }

        // 6. Custom Token
        const auth = getAuth();
        const customToken = await auth.createCustomToken(steamId, {
            displayName: profile.personaname,
            photoURL: profile.avatarfull
        });

        // Редірект тільки на свій домен
        return res.redirect(
            `${SITE_URL}/?steam_token=${encodeURIComponent(customToken)}`
        );

    } catch (err) {
        console.error('=== FATAL ERROR:', err.message, '===');
        return res.status(500).send('Internal server error');
    }
};
