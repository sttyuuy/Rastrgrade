/* =========================================================
   RASTRGRADE — Secure Client Script (FULL)
   ========================================================= */

const API_BASE = 'https://rastrgrade.vercel.app/api';

const state = {
    user: null,
    balance: 0,
    inventory: [],
    isLoggedIn: false,
    selectedSource: null,
    selectedTarget: null,
    shopFilter: 'all',
    shopSort: 'price-asc',
    invFilter: 'all',
    soundOn: true,
    spinSpeed: 'slow',
    isUpgrading: false
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function formatMoney(n) {
    return new Intl.NumberFormat('ru').format(Math.round(n * 100) / 100) + ' ⚙️';
}

function showToast(message, type = 'info') {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'win' ? '✓' : type === 'lose' ? '✕' : 'i'}</span><span>${message}</span>`;
    wrap.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
        btn.dataset.oldText = btn.textContent;
        btn.textContent = '...';
    } else if (btn.dataset.oldText) {
        btn.textContent = btn.dataset.oldText;
    }
}

// ====================== API (з токеном) ======================
async function api(path, options = {}) {
    let token = null;
    try {
        const user = window.fbAuth?.currentUser;
        if (user) token = await user.getIdToken();
    } catch (_) {}

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
        const err = new Error(data.error || 'Помилка сервера');
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

async function fetchUser() { return api('/user'); }
async function buySkin(skinId) {
    return api('/buy', { method: 'POST', body: JSON.stringify({ skinId }) });
}
async function sellSkin(itemUid) {
    return api('/sell', { method: 'POST', body: JSON.stringify({ itemUid }) });
}
async function doUpgrade(sourceUid, targetId) {
    return api('/upgrade', { method: 'POST', body: JSON.stringify({ sourceUid, targetId }) });
}

// ====================== UI ======================
function updateBalanceUI() {
    const el = $('#balance');
    if (el) el.textContent = formatMoney(state.balance);
    const shopBal = $('#shopBalance');
    if (shopBal) shopBal.textContent = formatMoney(state.balance);
}

function renderSkinIcon(skin) {
    if (skin && skin.shortname) {
        return `<div class="skin-icon"><img src="https://api.yrsproject.ru/public/image/Resize?shortname=${skin.shortname}&x=128&y=128" alt="${skin.name || ''}" loading="lazy" style="width:100%;height:100%;object-fit:contain"></div>`;
    }
    return `<div class="skin-icon">◆</div>`;
}

function getRarityClass(rarity) { return rarity || 'common'; }

// ====================== SHOP ======================
function renderShop() {
    const grid = $('#shopGrid');
    if (!grid || typeof SKINS === 'undefined') return;

    let list = [...SKINS];
    if (state.shopFilter !== 'all') list = list.filter(s => s.rarity === state.shopFilter);

    if (state.shopSort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.shopSort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.shopSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

    grid.innerHTML = list.map(skin => `
        <div class="shop-item ${getRarityClass(skin.rarity)}">
            ${renderSkinIcon(skin)}
            <div class="name">${skin.name}</div>
            <div class="rarity-label">${(RARITIES[skin.rarity] || {}).name || skin.rarity}</div>
            <div class="price-row"><span class="price">${formatMoney(skin.price)}</span></div>
            <button class="buy-btn" data-id="${skin.id}" ${state.balance < skin.price ? 'disabled' : ''}>Купити</button>
        </div>
    `).join('');

    grid.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => handleBuy(btn.dataset.id));
    });
}

async function handleBuy(skinId) {
    if (!state.isLoggedIn) return showToast('Спочатку увійди', 'lose');
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return;
    if (state.balance < skin.price) return showToast('Недостатньо коштів', 'lose');

    const modal = $('#buyModal');
    if (!modal) return;

    $('#buyTitle').textContent = skin.name;
    $('#buyPrice').textContent = formatMoney(skin.price);
    $('#buyIcon').innerHTML = renderSkinIcon(skin);
    modal.classList.add('show');

    const confirmBtn = $('#buyConfirm');
    const cancelBtn = $('#buyCancel');

    const onConfirm = async () => {
        modal.classList.remove('show');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        try {
            setLoading(confirmBtn, true);
            const result = await buySkin(skinId);
            state.balance = result.balance;
            state.inventory = result.inventory || state.inventory;
            updateBalanceUI();
            renderInventory();
            renderShop();
            renderUpgradeInventory();
            showToast(`Куплено: ${skin.name}`, 'win');
        } catch (err) {
            showToast(err.message || 'Помилка покупки', 'lose');
        } finally {
            setLoading(confirmBtn, false);
        }
    };

    const onCancel = () => {
        modal.classList.remove('show');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
}

// ====================== INVENTORY ======================
function renderInventory() {
    const grid = $('#inventory');
    if (!grid) return;

    let list = [...state.inventory];
    if (state.invFilter !== 'all') list = list.filter(i => i.rarity === state.invFilter);

    if (list.length === 0) {
        grid.innerHTML = `<div class="empty-inv">Інвентар порожній</div>`;
        return;
    }

    grid.innerHTML = list.map(item => `
        <div class="inv-item ${getRarityClass(item.rarity)}">
            ${renderSkinIcon(item)}
            <div class="name">${item.name}</div>
            <div class="price">${formatMoney(item.price)}</div>
            <button class="sell-btn" data-uid="${item.uid}">Продати</button>
        </div>
    `).join('');

    grid.querySelectorAll('.sell-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSell(btn.dataset.uid));
    });

    const countEl = $('#invCount');
    const valueEl = $('#invValue');
    if (countEl) countEl.textContent = state.inventory.length;
    if (valueEl) {
        const total = state.inventory.reduce((s, i) => s + (i.price || 0), 0);
        valueEl.textContent = formatMoney(total);
    }
}

async function handleSell(itemUid) {
    if (!state.isLoggedIn) return;
    try {
        const result = await sellSkin(itemUid);
        state.balance = result.balance;
        state.inventory = result.inventory || [];
        updateBalanceUI();
        renderInventory();
        renderUpgradeInventory();
        showToast('Продано', 'win');
    } catch (err) {
        showToast(err.message || 'Помилка продажу', 'lose');
    }
}

// ====================== UPGRADE ======================
function renderUpgradeInventory() {
    const list = $('#invPanelList');
    if (!list) return;

    if (state.inventory.length === 0) {
        list.innerHTML = `<div class="upg-inv-empty">Інвентар порожній</div>`;
        return;
    }

    list.innerHTML = state.inventory.map(item => `
        <div class="upg-inv-item ${getRarityClass(item.rarity)}" data-uid="${item.uid}">
            ${renderSkinIcon(item)}
            <div class="upg-inv-name">${item.name}</div>
            <div class="upg-inv-price">${formatMoney(item.price)}</div>
        </div>
    `).join('');

    list.querySelectorAll('.upg-inv-item').forEach(el => {
        el.addEventListener('click', () => {
            const item = state.inventory.find(i => i.uid === el.dataset.uid);
            if (item) selectSource(item);
        });
    });

    const countEl = $('#invPanelCount');
    if (countEl) countEl.textContent = `${state.inventory.length} шт.`;
}

function renderUpgradeTargets() {
    const grid = $('#itemsPanelGrid');
    if (!grid || typeof SKINS === 'undefined') return;

    let list = [...SKINS];
    if (state.selectedSource) {
        list = list.filter(s => s.price > state.selectedSource.price);
    }

    grid.innerHTML = list.map(skin => `
        <div class="upg-target-item ${getRarityClass(skin.rarity)}" data-id="${skin.id}">
            ${renderSkinIcon(skin)}
            <div class="upg-target-name">${skin.name}</div>
            <div class="upg-target-price">${formatMoney(skin.price)}</div>
        </div>
    `).join('');

    grid.querySelectorAll('.upg-target-item').forEach(el => {
        el.addEventListener('click', () => {
            const skin = SKINS.find(s => s.id === el.dataset.id);
            if (skin) selectTarget(skin);
        });
    });

    const countEl = $('#targetsCount');
    if (countEl) countEl.textContent = list.length;
}

function selectSource(item) {
    state.selectedSource = item;
    const slot = $('#sourceSlot');
    if (slot) {
        slot.classList.add('filled');
        slot.innerHTML = `${renderSkinIcon(item)}<div class="upg-item-name">${item.name}</div>`;
    }
    const priceLabel = $('#sourcePriceLabel');
    if (priceLabel) priceLabel.textContent = formatMoney(item.price);
    const removeBtn = $('#sourceRemoveBtn');
    if (removeBtn) removeBtn.style.display = 'block';
    renderUpgradeTargets();
    updateChance();
}

function selectTarget(skin) {
    state.selectedTarget = skin;
    const slot = $('#targetSlot');
    if (slot) {
        slot.classList.add('filled');
        slot.innerHTML = `${renderSkinIcon(skin)}<div class="upg-item-name">${skin.name}</div>`;
    }
    const priceLabel = $('#targetPriceLabel');
    if (priceLabel) priceLabel.textContent = formatMoney(skin.price);
    const removeBtn = $('#targetRemoveBtn');
    if (removeBtn) removeBtn.style.display = 'block';
    updateChance();
}

function clearSource() {
    state.selectedSource = null;
    const slot = $('#sourceSlot');
    if (slot) {
        slot.classList.remove('filled');
        slot.innerHTML = `<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Вибрати предмет</div></div>`;
    }
    const priceLabel = $('#sourcePriceLabel');
    if (priceLabel) priceLabel.textContent = '—';
    const removeBtn = $('#sourceRemoveBtn');
    if (removeBtn) removeBtn.style.display = 'none';
    updateChance();
}

function clearTarget() {
    state.selectedTarget = null;
    const slot = $('#targetSlot');
    if (slot) {
        slot.classList.remove('filled');
        slot.innerHTML = `<div class="upg-item-empty"><div class="upg-item-empty-icon">?</div><div class="upg-item-empty-text">Ціль</div></div>`;
    }
    const priceLabel = $('#targetPriceLabel');
    if (priceLabel) priceLabel.textContent = '—';
    const removeBtn = $('#targetRemoveBtn');
    if (removeBtn) removeBtn.style.display = 'none';
    updateChance();
}

function updateChance() {
    const percentEl = $('#circlePercent');
    const statusEl = $('#circleStatus');
    const btn = $('#upgradeBtn');
    const sector = $('#chanceSector');

    if (!state.selectedSource || !state.selectedTarget) {
        if (percentEl) percentEl.textContent = '—';
        if (statusEl) statusEl.textContent = 'ВИБЕРИ ПРЕДМЕТ';
        if (btn) btn.disabled = true;
        if (sector) sector.setAttribute('stroke-dasharray', '0 628.32');
        return;
    }

    const chance = Math.min(95, Math.max(1, (state.selectedSource.price / state.selectedTarget.price) * 100));
    if (percentEl) percentEl.textContent = chance.toFixed(1) + '%';
    if (statusEl) statusEl.textContent = 'ГОТОВО';
    if (btn) btn.disabled = false;

    if (sector) {
        const circ = 2 * Math.PI * 100;
        const filled = circ * (chance / 100);
        sector.setAttribute('stroke-dasharray', `${filled} ${circ}`);
    }
}

async function handleUpgrade() {
    if (state.isUpgrading || !state.selectedSource || !state.selectedTarget) return;
    if (!state.isLoggedIn) return showToast('Спочатку увійди', 'lose');

    state.isUpgrading = true;
    const btn = $('#upgradeBtn');
    if (btn) btn.disabled = true;

    try {
        const result = await doUpgrade(state.selectedSource.uid, state.selectedTarget.id);
        await animateUpgrade(result.chance, result.success);

        state.balance = result.balance;
        state.inventory = result.inventory || [];
        updateBalanceUI();
        renderInventory();
        renderUpgradeInventory();
        clearSource();
        clearTarget();

        showResultModal(result.success, result.wonItem);
    } catch (err) {
        showToast(err.message || 'Помилка апгрейду', 'lose');
    } finally {
        state.isUpgrading = false;
        if (btn) btn.disabled = false;
    }
}

function animateUpgrade(chance, success) {
    return new Promise(resolve => {
        const needle = $('#circleNeedle');
        if (!needle) return resolve();
        const duration = state.spinSpeed === 'fast' ? 1200 : 2800;
        const targetAngle = success
            ? Math.random() * (chance / 100) * 360
            : (chance / 100) * 360 + Math.random() * (360 - (chance / 100) * 360);
        needle.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.8, 0.2, 1)`;
        needle.style.transform = `rotate(${targetAngle + 720}deg)`;
        setTimeout(resolve, duration + 100);
    });
}

function showResultModal(win, item = null) {
    const modal = $('#resultModal');
    if (!modal) return;
    const title = $('#resultTitle');
    const value = $('#resultValue');
    if (win && item) {
        title.textContent = 'ПЕРЕМОГА';
        title.className = 'result-title result-win';
        value.textContent = '+' + formatMoney(item.price);
    } else {
        title.textContent = 'НЕВДАЧА';
        title.className = 'result-title result-lose';
        value.textContent = '—';
    }
    modal.classList.add('show');
}

// ====================== AUTH ======================
async function initAuth() {
    if (!window.fbReady) {
        window.addEventListener('fb-ready', initAuth);
        return;
    }

    const auth = window.fbAuth;

    window.fbOnAuthStateChanged(auth, async (user) => {
        if (user) {
            state.isLoggedIn = true;
            state.user = user;
            try {
                const data = await fetchUser();
                state.balance = data.balance || 0;
                state.inventory = data.inventory || [];
                updateBalanceUI();
                renderInventory();
                renderUpgradeInventory();
                renderShop();
            } catch (err) {
                console.error(err);
                showToast('Не вдалося завантажити дані', 'lose');
            }
        } else {
            state.isLoggedIn = false;
            state.user = null;
            state.balance = 0;
            state.inventory = [];
            updateBalanceUI();
            renderInventory();
        }
    });

    $('#googleLoginBtn')?.addEventListener('click', async () => {
        try {
            await window.fbSignInWithPopup(auth, window.fbGoogleProvider);
            $('#authModal')?.classList.remove('show');
        } catch (err) {
            $('#authError').textContent = err.message || 'Помилка входу';
        }
    });

    $('#steamLoginBtn')?.addEventListener('click', () => {
        window.location.href = `${API_BASE}/steam-auth`;
    });

    const params = new URLSearchParams(window.location.search);
    const steamToken = params.get('steam_token');
    if (steamToken) {
        try {
            await window.fbSignInWithCustomToken(auth, steamToken);
            window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
            showToast('Помилка Steam-входу', 'lose');
        }
    }
}

// ====================== INIT ======================
function initNavigation() {
    $$('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const page = tab.dataset.page;
            $$('.page').forEach(p => p.classList.remove('active'));
            $(`#page-${page}`)?.classList.add('active');
            if (page === 'shop') renderShop();
            if (page === 'inventory') renderInventory();
            if (page === 'upgrade') {
                renderUpgradeInventory();
                renderUpgradeTargets();
            }
        });
    });
}

function initFilters() {
    $$('.shop-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.shop-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.shopFilter = btn.dataset.rarity || 'all';
            renderShop();
        });
    });

    $('#shopSort')?.addEventListener('change', (e) => {
        state.shopSort = e.target.value;
        renderShop();
    });

    $$('.inv-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.inv-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.invFilter = btn.dataset.rarity || 'all';
            renderInventory();
        });
    });
}

function initUpgradeUI() {
    $('#sourceRemoveBtn')?.addEventListener('click', clearSource);
    $('#targetRemoveBtn')?.addEventListener('click', clearTarget);
    $('#upgradeBtn')?.addEventListener('click', handleUpgrade);

    $('#speedSlowBtn')?.addEventListener('click', () => {
        state.spinSpeed = 'slow';
        $('#speedSlowBtn').classList.add('active');
        $('#speedFastBtn')?.classList.remove('active');
    });
    $('#speedFastBtn')?.addEventListener('click', () => {
        state.spinSpeed = 'fast';
        $('#speedFastBtn').classList.add('active');
        $('#speedSlowBtn')?.classList.remove('active');
    });

    $('#resultContinue')?.addEventListener('click', () => {
        $('#resultModal')?.classList.remove('show');
    });
}

function initUserBadge() {
    $('#userBadge')?.addEventListener('click', () => {
        if (state.isLoggedIn) $('#logoutModal')?.classList.add('show');
        else $('#authModal')?.classList.add('show');
    });

    $('#logoutConfirm')?.addEventListener('click', async () => {
        try {
            await window.fbSignOut(window.fbAuth);
            $('#logoutModal')?.classList.remove('show');
            showToast('Вийшов з акаунту');
        } catch {
            showToast('Помилка виходу', 'lose');
        }
    });

    $('#logoutCancel')?.addEventListener('click', () => {
        $('#logoutModal')?.classList.remove('show');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    initUpgradeUI();
    initUserBadge();
    initAuth();
    if (typeof SKINS !== 'undefined') {
        renderShop();
        renderUpgradeTargets();
    }
});
