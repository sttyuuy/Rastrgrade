/**
 * Продаж усього інвентаря
 */
const { getFirestore } = require('../lib/firebase-admin');
const { isValidSteamId } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`sell-all:${ip}`, 5, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const { steamId } = req.body || {};

    if (!isValidSteamId(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);

        let total = 0;

        await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? data.inventory : [];

            total = inventory.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

            tx.update(userRef, {
                inventory: [],
                balance: (data.balance || 0) + total,
                totalSold: (data.totalSold || 0) + total,
            });
        });

        return res.status(200).json({ ok: true, total });
    } catch (e) {
        console.error('[sell-all] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
