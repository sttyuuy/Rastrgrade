const admin = require('firebase-admin');

// Ініціалізація Firebase Admin
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/@/g, '\n')
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

// In-memory кеш (швидкий, на час життя функції)
const _memCache = {};
const MEM_TTL = 10 * 60 * 1000; // 10 хв

// Firestore кеш (24 год)
const DB_TTL = 24 * 60 * 60 * 1000;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://rastrgrade.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { appid, market_hash_name } = req.query;
    if (!appid || !market_hash_name) {
        return res.status(400).json({ error: 'Missing appid or market_hash_name' });
    }

    const cacheKey = appid + '_' + market_hash_name;
    
    // 1. In-memory кеш
    if (_memCache[cacheKey] && (Date.now() - _memCache[cacheKey].time) < MEM_TTL) {
        return res.json(_memCache[cacheKey].data);
    }

    // 2. Firestore кеш
    let db = null;
    try {
        db = admin.firestore();
        const safeKey = cacheKey.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 500);
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
        const url = 'https://steamcommunity.com/market/priceoverview/?appid=' +
            encodeURIComponent(appid) +
            '&market_hash_name=' + encodeURIComponent(market_hash_name) +
            '&currency=1';

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (response.status === 429) {
            return res.status(429).json({ error: 'Rate limit', rateLimited: true });
        }

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Steam returned ' + response.status });
        }

        const data = await response.json();

        // Зберігаємо в Firestore на 24 год
        if (data && data.success && data.lowest_price && db) {
            try {
                const safeKey = cacheKey.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 500);
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

        // In-memory кеш
        _memCache[cacheKey] = { time: Date.now(), data: data };
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.json(data);
    } catch (e) {
        console.error('Price error:', e.message);
        res.status(500).json({ error: e.message });
    }
};
