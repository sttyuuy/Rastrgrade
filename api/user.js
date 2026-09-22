/**
 * Отримання даних користувача.
 * steamId береться з Bearer-токена (Firebase Auth uid = steamId).
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

module.exports = async (req, res) => {
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
            return res.status(404).json({ error: 'User not found' });
        }

        const data = userDoc.data();

        return res.status(200).json({
            steamId: data.steamId,
            balance: data.balance || 0,
            totalWon: data.totalWon || 0,
            totalSold: data.totalSold || 0,
            totalLost: data.totalLost || 0,
            purchases: data.purchases || 0,
            inventory: data.inventory || [],
        });
    } catch (e) {
        console.error('[user] error:', e.message);
        return res.status(500).json({ error: 'Internal error' });
    }
};
