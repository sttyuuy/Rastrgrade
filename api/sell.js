/**
 * Продаж одного предмета
 */
const { getFirestore } = require('../lib/firebase-admin');
const { isValidSteamId, isValidMarketHashName } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`sell:${ip}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const { steamId, marketHashName, sellPrice } = req.body || {};

    if (!isValidSteamId(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID' });
    }
    if (!isValidMarketHashName(marketHashName)) {
        return res.status(400).json({ error: 'Invalid item name' });
    }
    const price = Number(sellPrice);
    if (!Number.isFinite(price) || price <= 0 || price > 100000) {
        return res.status(400).json({ error: 'Invalid price' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);

        await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const idx = inventory.findIndex(i => i.marketHashName === marketHashName);
            if (idx === -1) throw new Error('Item not in inventory');

            inventory.splice(idx, 1);

            tx.update(userRef, {
                inventory,
                balance: (data.balance || 0) + price,
                totalSold: (data.totalSold || 0) + price,
            });
        });

        return res.status(200).json({ ok: true });
    } catch (e) {
        console.error('[sell] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
