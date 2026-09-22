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
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) {
                throw new Error('User not found');
            }

            const data = snap.data();
            const balance = data.balance || 0;
            const inventory = Array.isArray(data.inventory) ? data.inventory : [];

            if (inventory.length === 0) {
                return {
                    balance,
                    inventory: [],
                    soldCount: 0,
                    soldTotal: 0
                };
            }

            // Рахуємо загальну вартість усіх предметів
            const soldTotal = inventory.reduce((sum, item) => {
                return sum + (Number(item.price) || 0);
            }, 0);

            const newBalance = Math.round((balance + soldTotal) * 100) / 100;

            tx.update(userRef, {
                balance: newBalance,
                inventory: [],
                totalWon: (data.totalWon || 0) + soldTotal,
                updatedAt: Date.now()
            });

            return {
                balance: newBalance,
                inventory: [],
                soldCount: inventory.length,
                soldTotal: Math.round(soldTotal * 100) / 100
            };
        });

        return res.status(200).json(result);

    } catch (err) {
        if (err.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }

        console.error('Sell-all error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
