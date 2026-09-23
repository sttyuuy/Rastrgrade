/**
 * Тимчасовий ендпоінт для встановлення балансу СВОГО акаунту.
 * Тільки для розробки! Після налагодження — видалити.
 */
const { getFirestore, getAuth } = require('../../lib/firebase-admin');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async (req, res) => {
    setHeaders(res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let uid;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        uid = decoded.uid;
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { amount } = body || {};
    if (typeof amount !== 'number' || amount < 0 || amount > 10000000) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(uid);

        await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');
            tx.update(userRef, {
                balance: Math.round(amount * 100) / 100,
                updatedAt: Date.now()
            });
        });

        return res.status(200).json({ ok: true, uid, balance: amount });
    } catch (e) {
        console.error('[admin/set-balance]', e.message);
        return res.status(500).json({ error: e.message });
    }
};
