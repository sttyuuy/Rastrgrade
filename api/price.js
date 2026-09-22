const { getFirestore } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const {
    isValidAppId,
    isValidMarketHashName
} = require('../lib/validation');
const { fetchSteamPrice } = require('../lib/steam');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const MEM_TTL = 10 * 60 * 1000;       // 10 хв
const DB_TTL = 24 * 60 * 60 * 1000;   // 24 год

const _memCache = {};

function setSecurityHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
}

module.exports = async (req, res) => {
    setSecurityHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = getClientIp(req);
    if (!checkRateLimit(`ip:${clientIp}`, 40, 60 * 1000)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests', rateLimited: true });
    }

    const { appid, market_hash_name } = req.query;

    if (!appid || !market_hash_name) {
        return res.status(400).json({ error: 'Missing appid or market_hash_name' });
    }

    if (!isValidAppId(String(appid))) {
        return res.status(400).json({ error: 'Invalid appid' });
    }

    if (!isValidMarketHashName(market_hash_name)) {
        return res.status(400).json({ error: 'Invalid market_hash_name' });
    }

    const cacheKey = `${appid}_${market_hash_name}`;

    // 1. In-memory кеш
    if (_memCache[cacheKey] && (Date.now() - _memCache[cacheKey].time) < MEM_TTL) {
        return res.json(_memCache[cacheKey].data);
    }

    // 2. Firestore кеш
    let db = null;
    try {
        db = getFirestore();
        const safeKey = cacheKey.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 500);
        const cacheSnap = await db.collection('prices').doc(safeKey).get();

        if (cacheSnap.exists) {
            const data = cacheSnap.data();
            if (data.time && (Date.now() - data.time) < DB_TTL) {
                const result = { success: true, lowest_price: data.price, cached: true };
                _memCache[cacheKey] = { time: Date.now(), data: result };
                return res.json(result);
            }
        }
    } catch (e) {
        console.error('Firestore read error:', e.message);
    }

    // 3. Steam API
    try {
        const response = await fetchSteamPrice(appid, market_hash_name);

        if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit', rateLimited: true });
        }

        if (!response.ok) {
            return res.status(502).json({ error: 'Steam price service unavailable' });
        }

        const data = await response.json();

        // Зберігаємо в Firestore
        if (data && data.success && data.lowest_price && db) {
            try {
                const safeKey = cacheKey.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 500);
                await db.collection('prices').doc(safeKey).set({
                    price: data.lowest_price,
                    name: market_hash_name,
                    appid: appid,
                    time: Date.now()
                });
            } catch (e) {
                console.error('Firestore write error:', e.message);
            }
        }

        _memCache[cacheKey] = { time: Date.now(), data };
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.json(data);

    } catch (e) {
        if (e.name === 'AbortError') {
            return res.status(504).json({ error: 'Steam request timed out' });
        }
        console.error('Price error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
