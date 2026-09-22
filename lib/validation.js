/**
 * Валідація вхідних даних для Rastgrade API
 */

const RUST_APP_ID = '252490';
const CS2_APP_ID = '730';
const DOTA2_APP_ID = '570';

const ALLOWED_APP_IDS = [RUST_APP_ID, CS2_APP_ID, DOTA2_APP_ID];
const RUST_CONTEXT_ID = '2';

/**
 * Перевірка SteamID64 (17 цифр)
 */
function isValidSteamId(steamid) {
    return typeof steamid === 'string' && /^[0-9]{17}$/.test(steamid);
}

/**
 * Перевірка appid (тільки дозволені ігри)
 */
function isValidAppId(appid) {
    return typeof appid === 'string' && ALLOWED_APP_IDS.includes(appid);
}

/**
 * Перевірка, що appid === Rust
 */
function isRustAppId(appid) {
    return appid === RUST_APP_ID;
}

/**
 * Перевірка contextid
 */
function isValidContextId(contextid) {
    return typeof contextid === 'string' && /^[0-9]+$/.test(contextid);
}

/**
 * Перевірка, що contextid === 2 (Rust)
 */
function isRustContextId(contextid) {
    return contextid === RUST_CONTEXT_ID;
}

/**
 * Безпечна перевірка count
 */
function parseAndValidateCount(count, max = 2500) {
    if (count === undefined || count === null) {
        return { ok: true, value: max };
    }

    if (typeof count !== 'string' || !/^[0-9]+$/.test(count)) {
        return { ok: false, error: 'Invalid count' };
    }

    const num = Number(count);

    if (!Number.isInteger(num) || num < 1 || num > max) {
        return { ok: false, error: `Count must be between 1 and ${max}` };
    }

    return { ok: true, value: num };
}

/**
 * Перевірка market_hash_name
 */
function isValidMarketHashName(name) {
    return typeof name === 'string'
        && name.length > 0
        && name.length <= 200
        && !/[<>{}]/.test(name);
}

/**
 * Очистка рядка від небезпечних символів
 */
function sanitizeString(str, maxLength = 200) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
}

module.exports = {
    RUST_APP_ID,
    CS2_APP_ID,
    DOTA2_APP_ID,
    ALLOWED_APP_IDS,
    RUST_CONTEXT_ID,

    isValidSteamId,
    isValidAppId,
    isRustAppId,
    isValidContextId,
    isRustContextId,
    parseAndValidateCount,
    isValidMarketHashName,
    sanitizeString
};
