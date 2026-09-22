const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/@/g, '\n')
            : '';

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('=== FIREBASE ADMIN INIT OK ===');
    } catch (e) {
        console.error('=== FIREBASE INIT ERROR:', e.message, '===');
    }
}

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://rastrgrade.vercel.app');
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

        // 2. Перевірка підпису Steam
        const verifyParams = new URLSearchParams(query);
        verifyParams.set('openid.mode', 'check_authentication');

        const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyParams.toString()
        });

        const verifyText = await verifyResponse.text();
        if (!verifyText.includes('is_valid:true')) {
            console.error('=== INVALID STEAM SIGNATURE ===');
            return res.status(401).send('Invalid Steam signature');
        }

        // 3. Отримуємо SteamID
        const claimedId = query['openid.claimed_id'];
        if (!claimedId || typeof claimedId !== 'string') {
            return res.status(400).send('SteamID not found');
        }

        const steamIdMatch = claimedId.match(/\/id\/(\d{17})$/);
        if (!steamIdMatch) {
            return res.status(400).send('Invalid SteamID');
        }
        const steamId = steamIdMatch[1];

        // 4. Профіль через Steam API
        const apiKey = process.env.STEAM_API_KEY;
        let profile = { steamid: steamId, personaname: 'Player', avatarfull: '' };

        if (apiKey) {
            try {
                const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
                const steamResponse = await fetch(steamApiUrl);
                const steamData = await steamResponse.json();

                if (steamData.response?.players?.[0]) {
                    const p = steamData.response.players[0];
                    profile = {
                        steamid: p.steamid,
                        personaname: p.personaname || 'Player',
                        avatarfull: p.avatarfull || p.avatarmedium || p.avatar || ''
                    };
                }
            } catch (e) {
                console.error('Steam profile error:', e.message);
            }
        }

        // 5. Firestore
        try {
            const db = admin.firestore();
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
        const customToken = await admin.auth().createCustomToken(steamId, {
            displayName: profile.personaname,
            photoURL: profile.avatarfull
        });

        // Редірект тільки на свій домен
        return res.redirect(`https://rastrgrade.vercel.app/?steam_token=${encodeURIComponent(customToken)}`);

    } catch (err) {
        console.error('=== FATAL ERROR:', err.message, '===');
        return res.status(500).send('Internal server error');
    }
};
