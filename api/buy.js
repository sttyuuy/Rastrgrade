const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const { randomUUID } = require('crypto');
const SKINS = require('../lib/skins');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const MAX_QTY = 50;

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
}

function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

function withTimeout(p, ms, label) {
    return Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label)), ms))
    ]);
}

/* Ціни з Firestore — те саме джерело, що й на клієнті */
let _priceCache = null;
let _priceCacheAt = 0;
const PRICE_CACHE_TTL = 5 * 60 * 1000;

async function getFirestorePrices(db) {
    const now = Date.now();
    if (_priceCache && (now - _priceCacheAt) < PRICE_CACHE_TTL) return _priceCache;
    try {
        const snap = await withTimeout(db.collection('skins').get(), 8000, 'skins.get');
        const map = {};
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.price) map[norm(d.name)] = d.price;
        });
        _priceCache = map;
        _priceCacheAt = now;
        return map;
    } catch (e) {
        console.error('[buy] prices error:', e.message);
        return _priceCache || {}; // не кешуємо помилку
    }
}

async function getEffectivePrice(db, skin) {
    const prices = await getFirestorePrices(db);
    const fsPrice = prices[norm(skin.name)];
    return (fsPrice && fsPrice > 0) ? fsPrice : (skin.price || 0);
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const ip = getClientIp(req);
    if (!checkRateLimit(`buy:${ip}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let steamId;
    try {
        const decoded = await withTimeout(getAuth().verifyIdToken(token), 6000, 'verifyIdToken');
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
    if (!skinId || typeof skinId !== 'string') return res.status(400).json({ error: 'Missing skinId' });

    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(body.qty, 10) || 1));

    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return res.status(404).json({ error: 'Skin not found' });

    try {
        const db = getFirestore();
        const unitPrice = await getEffectivePrice(db, skin);
        const total = Math.round(unitPrice * qty * 100) / 100;
        const userRef = db.collection('users').doc(steamId);

        const result = await withTimeout(db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const balance = Number(data.balance) || 0;
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            if (balance < total - 0.001) throw new Error('Недостатньо коштів');

            const items = [];
            for (let i = 0; i < qty; i++) {
                items.push({
                    uid: randomUUID(),
                    id: skin.id,
                    name: skin.name,
                    shortname: skin.shortname || '',
                    svg: skin.svg || '',
                    rarity: skin.rarity,
                    price: unitPrice,
                    boughtAt: Date.now()
                });
            }
            inventory.push(...items);

            const newBalance = Math.round((balance - total) * 100) / 100;
            tx.update(userRef, {
                balance: newBalance,
                inventory,
                purchases: (data.purchases || 0) + qty,
                totalLost: Math.round(((data.totalLost || 0) + total) * 100) / 100,
                updatedAt: Date.now()
            });

            return { balance: newBalance, inventory, item: items[items.length - 1], items, spent: total, qty };
        }), 12000, 'transaction');

        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'Недостатньо коштів') return res.status(400).json({ error: 'Недостатньо коштів' });
        if (err.message === 'User not found') return res.status(404).json({ error: 'User not found' });
        console.error('[buy] error:', err.code, err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
