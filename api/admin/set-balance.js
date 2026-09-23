/**
 * Тимчасовий ендпоінт для встановлення балансу.
 * ТІЛЬКИ ДЛЯ АДМІНА (перевірка по ADMIN_UID).
 */
const { getFirestore, getAuth } = require('../../lib/firebase-admin');

const ADMIN_UID = 'q2iKqBYFzje5oP41ZRQTQJoMuiN2';
const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let uid;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        uid = decoded.uid;
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // 🔒 ТІЛЬКИ АДМІН
    if (uid !== ADMIN_UID) {
        console.warn('[admin/set-balance] Forbidden attempt by:', uid);
        return res.status(403).json({ error: 'Forbidden' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { amount, targetUid, mode } = body || {};

    // Визначаємо, кому міняємо баланс
    const finalTargetUid = targetUid || uid;

    // Режим: 'set' (встановити), 'add' (додати), 'reset' (в 5)
    const finalMode = mode || 'set';

    if (finalMode !== 'reset') {
        if (typeof amount !== 'number' || amount < 0 || amount > 10000000) {
            return res.status(400).json({ error: 'Invalid amount (0..10000000)' });
        }
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(finalTargetUid);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const currentBalance = Number(data.balance) || 0;

            let newBalance;
            if (finalMode === 'reset') {
                newBalance = 5;
            } else if (finalMode === 'add') {
                newBalance = Math.round((currentBalance + amount) * 100) / 100;
            } else {
                newBalance = Math.round(amount * 100) / 100;
            }

            tx.update(userRef, {
                balance: newBalance,
                updatedAt: Date.now()
            });

            return { oldBalance: currentBalance, newBalance };
        });

        console.log('[admin/set-balance] OK:', finalTargetUid, result);

        return res.status(200).json({
            ok: true,
            uid: finalTargetUid,
            mode: finalMode,
            oldBalance: result.oldBalance,
            balance: result.newBalance
        });

    } catch (e) {
        console.error('[admin/set-balance] error:', e.message);
        return res.status(500).json({ error: e.message });
    }
};
