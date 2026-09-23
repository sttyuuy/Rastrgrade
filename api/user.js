/**
 * Отримання даних користувача.
 * steamId береться з Bearer-токена (Firebase Auth uid = steamId).
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`user:${ip}`, 60, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let steamId;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        steamId = decoded.uid;
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(steamId).get();

        if (!userDoc.exists) {
            // Створюємо нового користувача
            const newUser = {
                steamId,
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
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            await db.collection('users').doc(steamId).set(newUser);
            return res.status(200).json(newUser);
        }

        const data = userDoc.data();

        return res.status(200).json({
            steamId: data.steamId || steamId,
            balance: data.balance || 0,
            inventory: data.inventory || [],
            totalWon: data.totalWon || 0,
            totalLost: data.totalLost || 0,
            totalSold: data.totalSold || 0,
            profit: data.profit || 0,
            upgrades: data.upgrades || 0,
            purchases: data.purchases || 0,
            housePlayerLost: data.housePlayerLost || 0,
            houseCasinoWon: data.houseCasinoWon || 0,
            bestDrop: data.bestDrop || null,
            bestUpgrade: data.bestUpgrade || null,
            xp: data.xp || 0,
            level: data.level || 1
        });
    } catch (e) {
        console.error('[user] error:', e.message);
        return res.status(500).json({ error: 'Internal error' });
    }
};
