const admin = require('firebase-admin');

// Инициализация Firebase Admin
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/@/g, '\n')
            : '';
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log('Firebase Admin initialized OK');
    } catch (e) {
        console.error('Firebase init error:', e.message);
    }
}

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://rastrgrade.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { query } = req;
        const returnTo = `https://${req.headers.host}${req.url.split('?')[0]}`;

        // 1. Клик по кнопке — редирект на Steam
        if (!query['openid.mode']) {
            const realm = `https://${req.headers.host}`;
            const redirectUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(returnTo)}&openid.realm=${encodeURIComponent(realm)}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;
            return res.redirect(redirectUrl);
        }

        // 2. Проверка подписи Steam
        const verifyParams = new URLSearchParams(query);
        verifyParams.set('openid.mode', 'check_authentication');

        const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: verifyParams.toString()
        });

        const verifyText = await verifyResponse.text();
        if (!verifyText.includes('is_valid:true')) {
            console.error('Steam signature invalid');
            return res.status(401).send('Invalid Steam signature');
        }

        // 3. Достаём SteamID
        const claimedId = query['openid.claimed_id'];
        const steamId = claimedId.split('/id/')[1];
        if (!steamId) {
            console.error('SteamID not found');
            return res.status(400).send('SteamID not found');
        }

        console.log('SteamID:', steamId);

        // 4. Профиль через Steam API (ник + аватар)
        const apiKey = process.env.STEAM_API_KEY;
        let profile = { steamid: steamId, personaname: 'Player', avatarfull: '' };

        if (apiKey) {
            try {
                const steamApiUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
                const steamResponse = await fetch(steamApiUrl);
                const steamData = await steamResponse.json();
                
                if (steamData.response && steamData.response.players && steamData.response.players[0]) {
                    const p = steamData.response.players[0];
                    profile = {
                        steamid: p.steamid,
                        personaname: p.personaname,
                        avatarfull: p.avatarfull || p.avatarmedium || p.avatar
                    };
                    console.log('Steam profile:', profile.personaname);
                }
            } catch (e) {
                console.error('Steam profile error:', e.message);
            }
        }

        // 5. Firestore — создаём/обновляем пользователя
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
                    updatedAt: Date.now()
                });
                console.log('New user created');
            } else {
                await userRef.update({
                    displayName: profile.personaname,
                    photoURL: profile.avatarfull,
                    updatedAt: Date.now()
                });
                console.log('User updated');
            }
        } catch (e) {
            console.error('Firestore error:', e.message);
        }

        // 6. Firebase Custom Token
        const customToken = await admin.auth().createCustomToken(steamId, {
            displayName: profile.personaname,
            photoURL: profile.avatarfull
        });

        console.log('Custom token created');
        res.redirect(`/?steam_token=${customToken}`);

    } catch (err) {
        console.error('Fatal error:', err.message, err.stack);
        res.status(500).send('Error: ' + err.message);
    }
};
