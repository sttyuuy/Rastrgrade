/**
 * Отримання даних користувача
 */
const { getFirestore } = require('../lib/firebase-admin');
const { isValidSteamId } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

module.exports = async (req, res) => {
    const ip = getClientIp(req);

    if (!checkRateLimit(`user:${ip}`, 60, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const steamId = String(req.query.steamId || '');

    if (!isValidSteamId(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID' });
    }

    try {
        const db = getFirestore();
        const userDoc = await db.collection('users').doc(steamId).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const data = userDoc.data();

        // Білий список полів — не віддаємо весь документ
        return res.status(200).json({
            steamId: data.steamId,
            balance: data.balance || 0,
            totalWon: data.totalWon || 0,
            totalSold: data.totalSold || 0,
            inventory: data.inventory || [],
        });
    } catch (e) {
        console.error('[user] error:', e.message);
        return res.status(500).json({ error: 'Internal error' });
    }
};
