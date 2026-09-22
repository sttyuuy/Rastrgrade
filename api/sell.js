const { getFirestore, getAuth } = require('../lib/firebase-admin');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

async function getUidFromRequest(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    try {
        const decoded = await getAuth().verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const uid = await getUidFromRequest(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { itemUid } = body || {};
    if (!itemUid || typeof itemUid !== 'string') {
        return res.status(400).json({ error: 'Missing itemUid' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const balance = data.balance || 0;
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const index = inventory.findIndex(i => i.uid === itemUid);
            if (index === -1) throw new Error('Item not found');

            const item = inventory[index];
            const sellPrice = item.price || 0;

            inventory.splice(index, 1);
            const newBalance = Math.round((balance + sellPrice) * 100) / 100;

            tx.update(userRef, {
                balance: newBalance,
                inventory,
                totalWon: (data.totalWon || 0) + sellPrice,
                updatedAt: Date.now()
            });

            return {
                balance: newBalance,
                inventory,
                soldPrice: sellPrice
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'Item not found') {
            return res.status(404).json({ error: 'Предмет не знайдено' });
        }
        if (err.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Sell error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
