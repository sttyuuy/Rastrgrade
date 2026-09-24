/**
 * API-клієнт для Rastgrade. Звичайний скрипт (без import/export).
 * Кожен запит має тайм-аут, щоб сайт не «висів» при повільному сервері.
 */
(function () {
    'use strict';

    const API_BASE = window.location.origin + '/api';
    let _authToken = null;

    function setAuthToken(token) { _authToken = token; }
    function clearAuthToken() { _authToken = null; }

    async function apiRequest(path, options = {}, timeoutMs = 20000) {
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);

        let res;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...options,
                headers,
                credentials: 'include',
                signal: ctrl.signal
            });
        } catch (e) {
            const err = new Error(e.name === 'AbortError'
                ? 'Сервер не отвечает, попробуй ещё раз'
                : 'Нет соединения с сервером');
            err.status = 0;
            throw err;
        } finally {
            clearTimeout(timer);
        }

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
        getSteamAuthUrl: () => `${API_BASE}/steam-auth`,

        getUserData: () => apiRequest('/user', {}, 12000),

        buyItem: (skinId, qty) => apiRequest('/buy', {
            method: 'POST',
            body: JSON.stringify({ skinId, qty: qty || 1 })
        }, 25000),

        sellItem: (itemUid) => apiRequest('/sell', {
            method: 'POST',
            body: JSON.stringify({ itemUid })
        }, 25000),

        sellAllItems: () => apiRequest('/sell-all', {
            method: 'POST',
            body: JSON.stringify({})
        }, 25000),

        doUpgrade: (sourceUid, targetId) => apiRequest('/upgrade', {
            method: 'POST',
            body: JSON.stringify({ sourceUid, targetId })
        }, 25000),

        setBalance: (amount, targetUid, mode) => apiRequest('/admin/set-balance', {
            method: 'POST',
            body: JSON.stringify({ amount, targetUid, mode })
        })
    };

    console.log('[api-client] loaded');
})();
