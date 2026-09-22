/**
 * Продаж одного предмета за uid.
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`sell:${ip}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let steamId;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        steamId = decoded.uid;
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { itemUid } = req.body || {};
    if (!itemUid || typeof itemUid !== 'string') {
        return res.status(400).json({ error: 'Missing itemUid' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const idx = inventory.findIndex(i => i.uid === itemUid);
            if (idx === -1) throw new Error('Item not in inventory');

            const item = inventory[idx];
            const price = Number(item.price) || 0;
            inventory.splice(idx, 1);

            const newBalance = Math.round(((data.balance || 0) + price) * 100) / 100;

            tx.update(userRef, {
                inventory,
                balance: newBalance,
                totalSold: Math.round(((data.totalSold || 0) + price) * 100) / 100,
                updatedAt: Date.now(),
            });

            return { balance: newBalance, sold: price, inventory };
        });

        return res.status(200).json(result);
    } catch (e) {
        console.error('[sell] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
