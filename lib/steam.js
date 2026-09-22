/**
 * Робота зі Steam API для Rastgrade
 */
const { isValidSteamId, isValidAppId, isValidContextId } = require('./validation');

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const STEAM_TIMEOUT_MS = 8000;

/**
 * Обгортка fetch з таймаутом
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = STEAM_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Отримати профіль гравця за SteamID64
 */
async function getSteamProfile(steamId) {
    if (!isValidSteamId(steamId)) {
        return { ok: false, error: 'Invalid SteamID' };
    }

    if (!STEAM_API_KEY) {
        return { ok: false, error: 'Steam API key not configured' };
    }

    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(STEAM_API_KEY)}&steamids=${encodeURIComponent(steamId)}`;
        const res = await fetchWithTimeout(url);

        if (!res.ok) {
            return { ok: false, error: `Steam API responded ${res.status}` };
        }

        const data = await res.json();
        const player = data?.response?.players?.[0];

        if (!player) {
            return { ok: false, error: 'Player not found' };
        }

        return {
            ok: true,
            profile: {
                steamId: player.steamid,
                personaName: player.personaname,
                avatar: player.avatarfull,
                profileUrl: player.profileurl,
            }
        };
    } catch (e) {
        return { ok: false, error: e.name === 'AbortError' ? 'Steam API timeout' : e.message };
    }
}

/**
 * Отримати інвентар гравця
 */
async function fetchSteamInventory(steamId, appId, contextId, count = 2500) {
    if (!isValidSteamId(steamId) || !isValidAppId(appId) || !isValidContextId(contextId)) {
        return { ok: false, error: 'Invalid parameters' };
    }

    try {
        const url = `https://steamcommunity.com/inventory/${encodeURIComponent(steamId)}/${encodeURIComponent(appId)}/${encodeURIComponent(contextId)}?l=english&count=${encodeURIComponent(count)}`;
        const res = await fetchWithTimeout(url);

        if (!res.ok) {
            return { ok: false, error: `Steam inventory responded ${res.status}` };
        }

        const data = await res.json();

        if (!data || !data.assets) {
            return { ok: true, items: [] };
        }

        return { ok: true, items: data.assets, descriptions: data.descriptions || [] };
    } catch (e) {
        return { ok: false, error: e.name === 'AbortError' ? 'Steam inventory timeout' : e.message };
    }
}

/**
 * Отримати ціну предмета
 */
async function fetchSteamPrice(appId, marketHashName) {
    if (!isValidAppId(appId) || typeof marketHashName !== 'string' || !marketHashName) {
        return { ok: false, error: 'Invalid parameters' };
    }

    try {
        const url = `https://steamcommunity.com/market/priceoverview/?appid=${encodeURIComponent(appId)}&currency=5&market_hash_name=${encodeURIComponent(marketHashName)}`;
        const res = await fetchWithTimeout(url);

        if (!res.ok) {
            return { ok: false, error: `Steam market responded ${res.status}` };
        }

        const data = await res.json();

        if (!data || !data.success) {
            return { ok: false, error: 'Price not available' };
        }

        return { ok: true, price: data.lowest_price || data.median_price || null };
    } catch (e) {
        return { ok: false, error: e.name === 'AbortError' ? 'Steam market timeout' : e.message };
    }
}

module.exports = {
    getSteamProfile,
    fetchSteamInventory,
    fetchSteamPrice,
    fetchWithTimeout,
};
