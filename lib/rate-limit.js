/**
 * Простий in-memory rate limiter.
 * Для Vercel serverless це захист на рівні одного warm instance.
 * Для великого навантаження краще замінити на Redis / Vercel KV.
 */

const store = new Map();

const DEFAULT_WINDOW = 60 * 1000; // 1 хвилина
const DEFAULT_MAX = 30;

function cleanup(windowMs) {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        if (now - value.start >= windowMs) {
            store.delete(key);
        }
    }
}

/**
 * @param {string} key - унікальний ключ (ip:xxx або steam:xxx)
 * @param {number} max - максимум запитів
 * @param {number} windowMs - вікно в мс
 * @returns {boolean} true = дозволено, false = заблоковано
 */
function checkRateLimit(key, max = DEFAULT_MAX, windowMs = DEFAULT_WINDOW) {
    if (store.size > 2000) {
        cleanup(windowMs);
    }

    const now = Date.now();
    const current = store.get(key);

    if (!current || now - current.start >= windowMs) {
        store.set(key, { start: now, count: 1 });
        return true;
    }

    if (current.count >= max) {
        return false;
    }

    current.count += 1;
    return true;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

module.exports = {
    checkRateLimit,
    getClientIp,
    cleanup
};
