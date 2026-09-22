const { getFirestore, getAuth } = require('../lib/firebase-admin');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const uid = await getUidFromRequest(req);
    if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const db = getFirestore();
        const snap = await db.collection('users').doc(uid).get();

        if (!snap.exists) {
            return res.status(404).json({ error: 'User not found' });
        }

        const data = snap.data();

        // Повертаємо тільки потрібні поля
        return res.status(200).json({
            balance: data.balance || 0,
            inventory: data.inventory || [],
            profit: data.profit || 0,
            totalWon: data.totalWon || 0,
            totalLost: data.totalLost || 0,
            upgrades: data.upgrades || 0,
            purchases: data.purchases || 0,
            level: data.level || 1,
            xp: data.xp || 0,
            displayName: data.displayName || '',
            photoURL: data.photoURL || ''
        });
    } catch (err) {
        console.error('User endpoint error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
