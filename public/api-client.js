/**
 * API-клієнт для Rastgrade.
 * Варіант B: Firebase Auth custom token (uid = steamId).
 */

const API_BASE = window.location.origin + '/api';

let _authToken = null;

/**
 * Встановити Firebase ID token (викликається після signInWithCustomToken)
 */
export function setAuthToken(token) {
    _authToken = token;
}

export function clearAuthToken() {
    _authToken = null;
}

async function apiRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (_authToken) {
        headers['Authorization'] = `Bearer ${_authToken}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include'
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        const error = new Error(data.error || 'Request failed');
        error.status = res.status;
        error.data = data;
        throw error;
    }

    return data;
}

// ===== Inventory =====
export async function loadSteamInventory(steamid, appid = '252490') {
    return apiRequest(
        `/inventory?steamid=${encodeURIComponent(steamid)}&appid=${encodeURIComponent(appid)}`
    );
}

// ===== Price =====
export async function getItemPrice(appid, marketHashName) {
    return apiRequest(
        `/price?appid=${encodeURIComponent(appid)}&market_hash_name=${encodeURIComponent(marketHashName)}`
    );
}

// ===== User data (steamId береться з токена на сервері) =====
export async function getUserData() {
    return apiRequest('/user');
}

// ===== Buy =====
export async function buyItem(skinId) {
    return apiRequest('/buy', {
        method: 'POST',
        body: JSON.stringify({ skinId })
    });
}

// ===== Sell (за uid предмета, не за marketHashName) =====
export async function sellItem(itemUid) {
    return apiRequest('/sell', {
        method: 'POST',
        body: JSON.stringify({ itemUid })
    });
}

// ===== Sell all =====
export async function sellAllItems() {
    return apiRequest('/sell-all', {
        method: 'POST',
        body: JSON.stringify({})
    });
}

// ===== Upgrade (source за uid, target за id з каталогу) =====
export async function doUpgrade(sourceUid, targetId) {
    return apiRequest('/upgrade', {
        method: 'POST',
        body: JSON.stringify({ sourceUid, targetId })
    });
}

// ===== Steam auth URL =====
export function getSteamAuthUrl() {
    return `${API_BASE}/steam-auth`;
}
