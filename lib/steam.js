/**
 * Робота зі Steam API для Rastgrade
 */

const { isValidSteamId } = require('./validation');

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

/**
 * Отримати профіль гравця за SteamID64
 */
async function getSteamProfile(steamId) {
    if (!isValidSteamId(steamId)) {
        throw new Error('Invalid SteamID');
    }

    const defaultProfile = {
        steamid: steamId,
        personaname: 'Player',
        avatarfull: '',
        profileurl: `https://steamcommunity.com/profiles/${steamId}`
    };

    if (!STEAM_API_KEY) {
        console.warn('[Steam] STEAM_API_KEY is missing');
        return defaultProfile;
    }

    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        let response;
        try {
            response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Rastgrade/1.0'
                }
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            console.error('[Steam] Profile request failed:', response.status);
            return defaultProfile;
        }

        const data = await response.json();
        const player = data?.response?.players?.[0];

        if (!player) {
            return defaultProfile;
        }

        return {
            steamid: player.steamid,
            personaname: player.personaname || 'Player',
            avatarfull: player.avatarfull || player.avatarmedium || player.avatar || '',
            profileurl: player.profileurl || defaultProfile.profileurl
        };

    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('[Steam] Profile request timed out');
        } else {
            console.error('[Steam] Profile error:', err.message);
        }
        return defaultProfile;
    }
}

/**
 * Перевірка підпису OpenID від Steam
 */
async function verifySteamOpenId(query) {
    try {
        const verifyParams = new URLSearchParams(query);
        verifyParams.set('openid.mode', 'check_authentication');

        const response = await fetch('https://steamcommunity.com/openid/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: verifyParams.toString()
        });

        const text = await response.text();
        return text.includes('is_valid:true');
    } catch (err) {
        console.error('[Steam] OpenID verify error:', err.message);
        return false;
    }
}

/**
 * Витягнути SteamID64 з claimed_id
 */
function extractSteamIdFromClaimedId(claimedId) {
    if (typeof claimedId !== 'string') return null;

    const match = claimedId.match(/\/(?:id|profiles)\/(\d{17})$/);
    return match ? match[1] : null;
}

/**
 * Отримати інвентар (внутрішній хелпер)
 */
async function fetchSteamInventory(steamId, appId, contextId = '2', count = 2500) {
    if (!isValidSteamId(steamId)) {
        throw new Error('Invalid SteamID');
    }

    const url = `https://steamcommunity.com/inventory/${encodeURIComponent(steamId)}/${appId}/${contextId}?l=english&count=${count}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Rastgrade/1.0 Inventory Service',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: controller.signal
        });

        return response;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Отримати ціну предмета з Steam Market
 */
async function fetchSteamPrice(appId, marketHashName) {
    const url =
        'https://steamcommunity.com/market/priceoverview/' +
        `?appid=${encodeURIComponent(appId)}` +
        `&market_hash_name=${encodeURIComponent(marketHashName)}` +
        '&currency=1';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            signal: controller.signal
        });

        return response;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    getSteamProfile,
    verifySteamOpenId,
    extractSteamIdFromClaimedId,
    fetchSteamInventory,
    fetchSteamPrice
};
