/**
 * Дані користувача. steamId береться з Bearer-токена (Firebase Auth uid).
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
}

function withTimeout(p, ms, label) {
    return Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('TIMEOUT ' + label), { code: 'TIMEOUT' })), ms))
    ]);
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const ip = getClientIp(req);
    if (!checkRateLimit(`user:${ip}`, 60, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let steamId;
    try {
        const decoded = await withTimeout(getAuth().verifyIdToken(token), 6000, 'verifyIdToken');
        steamId = decoded.uid;
    } catch (e) {
        console.error('[user] token error:', e.code || e.message);
        return res.status(401).json({ error: 'Invalid token' });
    }

    try {
        const db = getFirestore();
        const ref = db.collection('users').doc(steamId);
        const userDoc = await withTimeout(ref.get(), 7000, 'users.get');

        if (!userDoc.exists) {
            const newUser = {
                steamId, displayName: null, photoURL: null, balance: 5, inventory: [],
                totalWon: 0, totalLost: 0, totalSold: 0, profit: 0, upgrades: 0, purchases: 0,
                housePlayerLost: 0, houseCasinoWon: 0, bestDrop: null, bestUpgrade: null,
                xp: 0, level: 1, createdAt: Date.now(), updatedAt: Date.now()
            };
            await withTimeout(ref.set(newUser), 7000, 'users.set');
            return res.status(200).json(newUser);
        }

        const d = userDoc.data();
        return res.status(200).json({
            steamId: d.steamId || steamId,
            displayName: d.displayName || null,
            photoURL: d.photoURL || null,
            balance: d.balance || 0,
            inventory: d.inventory || [],
            totalWon: d.totalWon || 0,
            totalLost: d.totalLost || 0,
            totalSold: d.totalSold || 0,
            // сервер не оновлює поле profit, тому рахуємо тут
            profit: round2((d.totalWon || 0) - (d.totalLost || 0)),
            upgrades: d.upgrades || 0,
            purchases: d.purchases || 0,
            housePlayerLost: d.housePlayerLost || 0,
            houseCasinoWon: d.houseCasinoWon || 0,
            bestDrop: d.bestDrop || null,
            bestUpgrade: d.bestUpgrade || null,
            xp: d.xp || 0,
            level: d.level || 1
        });
    } catch (e) {
        console.error('[user] error:', e.code, e.message);
        return res.status(500).json({ error: 'Internal error', code: String(e.code || 'UNKNOWN') });
    }
};
