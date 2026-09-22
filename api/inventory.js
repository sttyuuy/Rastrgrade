const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const RUST_APP_ID = '252490';
const RUST_CONTEXT_ID = '2';
const MAX_COUNT = 2500;
const CACHE_SECONDS = 300;

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestStore = new Map();

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

    if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    current.count++;
    return true;
}

function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, value] of requestStore.entries()) {
        if (now - value.start >= RATE_LIMIT_WINDOW) {
            requestStore.delete(key);
        }
    }
}

function setSecurityHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Vary', 'Origin');
}

function isValidSteamId(steamid) {
    return /^[0-9]{17}$/.test(steamid);
}

function isValidContextId(contextid) {
    return /^[0-9]+$/.test(contextid);
}

module.exports = async (req, res) => {
    setSecurityHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (requestStore.size > 1000) cleanupRateLimitStore();

    const clientIp = getClientIp(req);
    if (!checkRateLimit(`ip:${clientIp}`)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests. Please try again later.', rateLimited: true });
    }

    const { steamid, appid, contextid, count } = req.query;

    if (!steamid) return res.status(400).json({ error: 'Missing steamid' });
    if (!appid) return res.status(400).json({ error: 'Missing appid' });

    if (typeof steamid !== 'string' || !isValidSteamId(steamid)) {
        return res.status(400).json({ error: 'Invalid SteamID format' });
    }

    if (typeof appid !== 'string' || appid !== RUST_APP_ID) {
        return res.status(400).json({ error: 'Invalid appid' });
    }

    const ctx = contextid || RUST_CONTEXT_ID;
    if (typeof ctx !== 'string' || !isValidContextId(ctx) || ctx !== RUST_CONTEXT_ID) {
        return res.status(400).json({ error: 'Invalid contextid' });
    }

    let requestedCount = 2500;
    if (count !== undefined) {
        if (typeof count !== 'string' || !/^[0-9]+$/.test(count)) {
            return res.status(400).json({ error: 'Invalid count' });
        }
        requestedCount = Number(count);
        if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > MAX_COUNT) {
            return res.status(400).json({ error: `Count must be between 1 and ${MAX_COUNT}` });
        }
    }

    if (!checkRateLimit(`steam:${steamid}`)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests for this Steam account.', rateLimited: true });
    }

    const steamUrl =
        `https://steamcommunity.com/inventory/` +
        `${encodeURIComponent(steamid)}/` +
        `${RUST_APP_ID}/` +
        `${RUST_CONTEXT_ID}` +
        `?l=english&count=${requestedCount}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let response;
        try {
            response = await fetch(steamUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Rastgrade/1.0 Inventory Service',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (response.status === 429) {
            res.setHeader('Retry-After', '60');
            return res.status(429).json({ error: 'Steam rate limit reached. Please try again later.', rateLimited: true });
        }

        if (response.status === 403) {
            return res.status(403).json({ error: 'Steam inventory is private or Steam blocked the request.', private: true });
        }

        if (response.status === 404) {
            return res.status(404).json({ error: 'Steam inventory not found.' });
        }

        if (!response.ok) {
            console.error('Steam inventory request failed:', response.status);
            return res.status(502).json({ error: 'Steam inventory service unavailable.' });
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            return res.status(502).json({ error: 'Invalid response from Steam.' });
        }

        const data = await response.json();

        if (!data || typeof data !== 'object') {
            return res.status(502).json({ error: 'Invalid Steam response.' });
        }

        const assets = Array.isArray(data.assets) ? data.assets : [];
        const descriptions = Array.isArray(data.descriptions) ? data.descriptions : [];

        if (assets.length === 0) {
            res.setHeader('Cache-Control', `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`);
            return res.status(200).json({ assets: [], descriptions: [], empty: true });
        }

        const safeResponse = {
            assets,
            descriptions,
            total_inventory_count: Number.isInteger(data.total_inventory_count) ? data.total_inventory_count : assets.length,
            more_items: Boolean(data.more_items)
        };

        res.setHeader('Cache-Control', `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`);
        return res.status(200).json(safeResponse);

    } catch (error) {
        if (error && error.name === 'AbortError') {
            return res.status(504).json({ error: 'Steam inventory request timed out.' });
        }

        console.error('Inventory endpoint error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
