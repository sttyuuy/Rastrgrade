/**
 * API-клієнт для Rastgrade.
 * Працює як звичайний скрипт (без import/export),
 * щоб script.js (IIFE) міг його використовувати.
 */
(function () {
    'use strict';

    const API_BASE = window.location.origin + '/api';
    let _authToken = null;

    function setAuthToken(token) { _authToken = token; }
    function clearAuthToken() { _authToken = null; }

    async function apiRequest(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
            credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const err = new Error(data.error || 'Request failed');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    window.apiClient = {
        setAuthToken,
        clearAuthToken,
        loadSteamInventory: (steamid, appid = '252490') =>
            apiRequest(`/inventory?steamid=${encodeURIComponent(steamid)}&appid=${encodeURIComponent(appid)}`),
        getItemPrice: (appid, name) =>
            apiRequest(`/price?appid=${encodeURIComponent(appid)}&market_hash_name=${encodeURIComponent(name)}`),
        getUserData: () => apiRequest('/user'),
        buyItem: (skinId) => apiRequest('/buy', { method: 'POST', body: JSON.stringify({ skinId }) }),
        sellItem: (itemUid) => apiRequest('/sell', { method: 'POST', body: JSON.stringify({ itemUid }) }),
        sellAllItems: () => apiRequest('/sell-all', { method: 'POST', body: JSON.stringify({}) }),
        doUpgrade: (sourceUid, targetId) =>
            apiRequest('/upgrade', { method: 'POST', body: JSON.stringify({ sourceUid, targetId }) }),
        getSteamAuthUrl: () => `${API_BASE}/steam-auth`
    };
})();
