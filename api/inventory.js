const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const {
    RUST_APP_ID,
    RUST_CONTEXT_ID,
    isValidSteamId,
    isRustAppId,
    isRustContextId,
    parseAndValidateCount
} = require('../lib/validation');
const { fetchSteamInventory } = require('../lib/steam');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const CACHE_SECONDS = 300;
const MAX_COUNT = 2500;

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

module.exports = async (req, res) => {
    setSecurityHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIp = getClientIp(req);

    // Rate limit по IP
    if (!checkRateLimit(`ip:${clientIp}`, 30, 60 * 1000)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({
            error: 'Too many requests. Please try again later.',
            rateLimited: true
        });
    }

    const { steamid, appid, contextid, count } = req.query;

    if (!steamid) return res.status(400).json({ error: 'Missing steamid' });
    if (!appid) return res.status(400).json({ error: 'Missing appid' });

    if (!isValidSteamId(steamid)) {
        return res.status(400).json({ error: 'Invalid SteamID format' });
    }

    if (!isRustAppId(appid)) {
        return res.status(400).json({ error: 'Invalid appid' });
    }

    const ctx = contextid || RUST_CONTEXT_ID;
    if (!isRustContextId(ctx)) {
        return res.status(400).json({ error: 'Invalid contextid' });
    }

    const countResult = parseAndValidateCount(count, MAX_COUNT);
    if (!countResult.ok) {
        return res.status(400).json({ error: countResult.error });
    }

    // Додатковий rate limit по SteamID
    if (!checkRateLimit(`steam:${steamid}`, 20, 60 * 1000)) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({
            error: 'Too many requests for this Steam account.',
            rateLimited: true
        });
    }

    try {
        const response = await fetchSteamInventory(
            steamid,
            RUST_APP_ID,
            RUST_CONTEXT_ID,
            countResult.value
        );

        if (response.status === 429) {
            res.setHeader('Retry-After', '60');
            return res.status(429).json({
                error: 'Steam rate limit reached. Please try again later.',
                rateLimited: true
            });
        }

        if (response.status === 403) {
            return res.status(403).json({
                error: 'Steam inventory is private or Steam blocked the request.',
                private: true
            });
        }

        if (response.status === 404) {
            return res.status(404).json({ error: 'Steam inventory not found.' });
        }

        if (!response.ok) {
            console.error('Steam inventory failed:', response.status);
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
            res.setHeader(
                'Cache-Control',
                `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`
            );
            return res.status(200).json({
                assets: [],
                descriptions: [],
                empty: true
            });
        }

        const safeResponse = {
            assets,
            descriptions,
            total_inventory_count: Number.isInteger(data.total_inventory_count)
                ? data.total_inventory_count
                : assets.length,
            more_items: Boolean(data.more_items)
        };

        res.setHeader(
            'Cache-Control',
            `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`
        );

        return res.status(200).json(safeResponse);

    } catch (error) {
        if (error && error.name === 'AbortError') {
            return res.status(504).json({ error: 'Steam inventory request timed out.' });
        }

        console.error('Inventory endpoint error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};
