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
        // ===== Auth =====
        setAuthToken,
        clearAuthToken,
        getSteamAuthUrl: () => `${API_BASE}/steam-auth`,

        // ===== User =====
        getUserData: () => apiRequest('/user'),

        // ===== Inventory (Steam) =====
        loadSteamInventory: (steamid, appid = '252490') =>
            apiRequest(`/inventory?steamid=${encodeURIComponent(steamid)}&appid=${encodeURIComponent(appid)}`),

        // ===== Price =====
        getItemPrice: (appid, name) =>
            apiRequest(`/price?appid=${encodeURIComponent(appid)}&market_hash_name=${encodeURIComponent(name)}`),

        // ===== Buy =====
        buyItem: (skinId) => apiRequest('/buy', {
            method: 'POST',
            body: JSON.stringify({ skinId })
        }),

        // ===== Sell =====
        sellItem: (itemUid) => apiRequest('/sell', {
            method: 'POST',
            body: JSON.stringify({ itemUid })
        }),

        // ===== Sell All =====
        sellAllItems: () => apiRequest('/sell-all', {
            method: 'POST',
            body: JSON.stringify({})
        }),

        // ===== Upgrade =====
        doUpgrade: (sourceUid, targetId) => apiRequest('/upgrade', {
            method: 'POST',
            body: JSON.stringify({ sourceUid, targetId })
        }),

        // ===== Admin: Set Balance (тимчасово, для розробки) =====
        setBalance: (amount) => apiRequest('/admin/set-balance', {
            method: 'POST',
            body: JSON.stringify({ amount })
        })
    };

    console.log('[api-client] loaded, apiClient ready');
})();
