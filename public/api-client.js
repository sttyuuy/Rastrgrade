const API_BASE = 'https://rastrgrade.vercel.app/api';

async function apiRequest(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
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
    return apiRequest(`/inventory?steamid=${encodeURIComponent(steamid)}&appid=${appid}`);
}

// ===== Price =====
export async function getItemPrice(appid, marketHashName) {
    return apiRequest(
        `/price?appid=${encodeURIComponent(appid)}&market_hash_name=${encodeURIComponent(marketHashName)}`
    );
}

// ===== User data (потрібно буде зробити окремий endpoint) =====
export async function getUserData() {
    return apiRequest('/user');
}

export async function buyItem(skinId) {
    return apiRequest('/buy', {
        method: 'POST',
        body: JSON.stringify({ skinId })
    });
}

export async function sellItem(itemUid) {
    return apiRequest('/sell', {
        method: 'POST',
        body: JSON.stringify({ itemUid })
    });
}

export async function doUpgrade(sourceUid, targetId) {
    return apiRequest('/upgrade', {
        method: 'POST',
        body: JSON.stringify({ sourceUid, targetId })
    });
}
