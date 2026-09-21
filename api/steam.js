const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
    });
}

module.exports = async (req, res) => {
    const { query } = req;
    const returnTo = `https://${req.headers.host}${req.url.split('?')[0]}`;

    if (!query['openid.mode']) {
        const realm = `https://${req.headers.host}`;
        const redirectUrl = `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=${encodeURIComponent(returnTo)}&openid.realm=${encodeURIComponent(realm)}&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`;
        return res.redirect(redirectUrl);
    }

    const verifyParams = new URLSearchParams(query);
    verifyParams.set('openid.mode', 'check_authentication');

    const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyParams
    });
    const verifyText = await verifyResponse.text();
    if (!verifyText.includes('is_valid:true')) {
        return res.status(401).send('Invalid Steam signature');
    }

    const claimedId = query['openid.claimed_id'];
    const steamId = claimedId.split('/id/')[1];
    if (!steamId) return res.status(400).send('SteamID not found');

    const apiKey = process.env.STEAM_API_KEY;
    let profile = { steamid: steamId, personaname: 'Player', avatarfull: '' };

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
        }
    } catch (e) { console.error('Steam profile error:', e); }

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
                profit: 0, totalWon: 0, totalLost: 0,
                upgrades: 0, purchases: 0,
                bestDrop: null, bestUpgrade: null,
                housePlayerLost: 0, houseCasinoWon: 0,
                xp: 0, level: 1,
                soundOn: true,
                shopFilter: 'all', shopSort: 'price-asc',
                spinSpeed: 'slow',
                updatedAt: Date.now()
            });
        } else {
            await userRef.update({
                displayName: profile.personaname,
                photoURL: profile.avatarfull,
                updatedAt: Date.now()
            });
        }
    } catch (e) { console.error('Firestore error:', e); }

    try {
        const customToken = await admin.auth().createCustomToken(steamId, {
            displayName: profile.personaname,
            photoURL: profile.avatarfull
        });
        res.redirect(`/?steam_token=${customToken}`);
    } catch (error) {
        console.error('Token error:', error);
        res.status(500).send('Error creating token');
    }
};
