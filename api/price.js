// In-memory cache (живе поки Vercel не перезавантажить функцію)
const _cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 хвилин

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
    const cached = _cache[cacheKey];
    if (cached && (Date.now() - cached.time) < CACHE_TTL) {
        return res.json(cached.data);
    }

    try {
        const url = 'https://steamcommunity.com/market/priceoverview/?appid=' +
            encodeURIComponent(appid) +
            '&market_hash_name=' + encodeURIComponent(market_hash_name) +
            '&currency=1'; // 1 = USD

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (response.status === 429) {
            return res.status(429).json({ error: 'Steam rate limit. Подожди минуту.', rateLimited: true });
        }

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Steam returned ' + response.status });
        }

        const data = await response.json();

        // Кешуємо
        _cache[cacheKey] = { time: Date.now(), data: data };

        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(data);
    } catch (e) {
        console.error('Price error:', e.message);
        res.status(500).json({ error: e.message });
    }
};
