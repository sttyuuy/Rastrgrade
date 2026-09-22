const admin = require('firebase-admin');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const MEM_TTL = 10 * 60 * 1000;      // 10 хв
const DB_TTL = 24 * 60 * 60 * 1000;  // 24 год

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 40;
const requestStore = new Map();

const _memCache = {};

if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/@/g, '\n')
            : '';

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    } catch (e) {
        console.error('Firebase init error:', e.message);
    }
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
    const now = Date.now();
    const current = requestStore.get(key);

    if (!current || now - current.start >= RATE_LIMIT_WINDOW) {
        requestStore.set(key, { start: now, count: 1 });
        return true;
    }
    if (current.count >= RATE_LIMIT_MAX) return false;
    current.count++;
    return true;
}

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
    if (!checkRateLimit(`ip:${clientIp}`)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests', rateLimited: true });
    }

    const { appid, market_hash_name } = req.query;

    if (!appid || !market_hash_name) {
        return res.status(400).json({ error: 'Missing appid or market_hash_name' });
    }

    // Дозволяємо тільки потрібні ігри (Rust + CS2 + Dota 2)
    const allowedApps = ['252490', '730', '570'];
    if (!allowedApps.includes(String(appid))) {
        return res.status(400).json({ error: 'Invalid appid' });
    }

    if (typeof market_hash_name !== 'string' || market_hash_name.length > 200) {
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
        db = admin.firestore();
        const safeKey = cacheKey.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 500);
        const cacheRef = db.collection('prices').doc(safeKey);
        const cacheSnap = await cacheRef.get();

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
        const url =
            'https://steamcommunity.com/market/priceoverview/?appid=' +
            encodeURIComponent(appid) +
            '&market_hash_name=' + encodeURIComponent(market_hash_name) +
            '&currency=1';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let response;
        try {
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit', rateLimited: true });
        }

        if (!response.ok) {
            return res.status(502).json({ error: 'Steam price service unavailable' });
        }

        const data = await response.json();

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
