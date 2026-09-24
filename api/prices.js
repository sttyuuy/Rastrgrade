const { getFirestore } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 хв браузерний кеш
}

function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

/* ── Кеш цін на 5 хвилин (на рівні модуля) ── */
let _priceCache = null;
let _priceCacheAt = 0;
const PRICE_CACHE_TTL = 5 * 60 * 1000;

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const ip = getClientIp(req);
    if (!checkRateLimit(`prices:${ip}`, 60, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    // Кеш
    const now = Date.now();
    if (_priceCache && (now - _priceCacheAt) < PRICE_CACHE_TTL) {
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(_priceCache);
    }

    try {
        const db = getFirestore();
        const snap = await db.collection('skins').get();
        const map = {};
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.price) {
                map[norm(d.name)] = d.price;
            }
        });
        _priceCache = map;
        _priceCacheAt = now;
        res.setHeader('X-Cache', 'MISS');
        console.log('[prices] loaded', Object.keys(map).length, 'prices from Firestore');
        return res.status(200).json(map);
    } catch (e) {
        console.error('[prices] error:', e.code, e.message);
        // Якщо є старий кеш — віддаємо його навіть протермінований
        if (_priceCache) {
            res.setHeader('X-Cache', 'STALE');
            return res.status(200).json(_priceCache);
        }
        return res.status(500).json({ error: 'Internal error' });
    }
};
