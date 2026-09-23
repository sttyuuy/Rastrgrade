const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const { randomUUID } = require('crypto');
const SKINS = require('../lib/skins');

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

    const ip = getClientIp(req);
    if (!checkRateLimit(`buy:${ip}`, 30, 60 * 1000)) {
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

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { skinId } = body || {};
    if (!skinId || typeof skinId !== 'string') {
        return res.status(400).json({ error: 'Missing skinId' });
    }

    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) {
        return res.status(404).json({ error: 'Skin not found' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const balance = data.balance || 0;
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            if (balance < skin.price) {
                throw new Error('Недостатньо коштів');
            }

            const newItem = {
                uid: randomUUID(),
                id: skin.id,
                name: skin.name,
                shortname: skin.shortname || '',
                svg: skin.svg || '',
                rarity: skin.rarity,
                price: skin.price,
                boughtAt: Date.now()
            };

            const newBalance = Math.round((balance - skin.price) * 100) / 100;
            inventory.push(newItem);

            tx.update(userRef, {
                balance: newBalance,
                inventory,
                purchases: (data.purchases || 0) + 1,
                totalLost: Math.round(((data.totalLost || 0) + skin.price) * 100) / 100,
                updatedAt: Date.now()
            });

            return {
                balance: newBalance,
                inventory,
                item: newItem
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'Недостатньо коштів') {
            return res.status(400).json({ error: 'Недостатньо коштів' });
        }
        if (err.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Buy error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
