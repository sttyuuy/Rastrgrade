/* =========================================================
   RASTRGRADE — Secure Client Script
   ========================================================= */

const API_BASE = 'https://rastrgrade.vercel.app/api';

// ====================== STATE ======================
const state = {
    user: null,
    balance: 0,
    inventory: [],
    isLoggedIn: false,
    selectedSource: null,   // { uid, id, name, price, rarity }
    selectedTarget: null,   // { id, name, price, rarity }
    shopFilter: 'all',
    shopSort: 'price-asc',
    invFilter: 'all',
    soundOn: true,
    spinSpeed: 'slow',
    isUpgrading: false
};

// ====================== HELPERS ======================
function $(sel) {
    return document.querySelector(sel);
}

function $$(sel) {
    return document.querySelectorAll(sel);
}

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

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
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

// ====================== API CLIENT ======================
async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        credentials: 'include'
    });

    let data = {};
    try {
        data = await res.json();
    } catch (_) {}

    if (!res.ok) {
        const err = new Error(data.error || 'Помилка сервера');
        err.status = res.status;
        err.data = data;
        throw err;
    }

    return data;
}

async function fetchUser() {
    return api('/user');
}

async function buySkin(skinId) {
    return api('/buy', {
        method: 'POST',
        body: JSON.stringify({ skinId })
    });
}

async function sellSkin(itemUid) {
    return api('/sell', {
        method: 'POST',
        body: JSON.stringify({ itemUid })
    });
}

async function sellAllSkins() {
    return api('/sell-all', { method: 'POST' });
}

async function doUpgrade(sourceUid, targetId) {
    return api('/upgrade', {
        method: 'POST',
        body: JSON.stringify({ sourceUid, targetId })
    });
}

// ====================== UI UPDATE ======================
function updateBalanceUI() {
    const el = $('#balance');
    if (el) el.textContent = formatMoney(state.balance);

    const shopBal = $('#shopBalance');
    if (shopBal) shopBal.textContent = formatMoney(state.balance);
}

function updateProfitUI(profit = 0) {
    const el = $('#profit');
    if (!el) return;
    el.textContent = formatMoney(profit);
    el.classList.toggle('green', profit >= 0);
    el.classList.toggle('red', profit < 0);
}

function updateLevelUI(level = 1, xp = 0) {
    const badge = $('#levelBadge');
    const name = $('#levelName');
    const bar = $('#levelBarFill');

    if (badge) badge.textContent = level;
    if (name) name.textContent = level <= 5 ? 'НОВИЧОК' : level <= 15 ? 'БОЄЦЬ' : 'ЛЕГЕНДА';
    if (bar) bar.style.width = `${Math.min(100, (xp % 100))}%`;
}

// ====================== RENDER SKIN ======================
function renderSkinIcon(skin) {
    if (skin.shortname) {
        return `<div class="skin-icon">
            <img src="https://api.yrsproject.ru/public/image/Resize?shortname=${skin.shortname}&x=128&y=128"
                 alt="${skin.name}" loading="lazy"
                 style="width:100%;height:100%;object-fit:contain">
        </div>`;
    }
    return `<div class="skin-icon">◆</div>`;
}

function getRarityClass(rarity) {
    return rarity || 'common';
}

// ====================== SHOP ======================
function renderShop() {
    const grid = $('#shopGrid');
    if (!grid || typeof SKINS === 'undefined') return;

    let list = [...SKINS];

    if (state.shopFilter !== 'all') {
        list = list.filter(s => s.rarity === state.shopFilter);
    }

    if (state.shopSort === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (state.shopSort === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (state.shopSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.shopSort === 'rarity') {
        const order = { common: 1, rare: 2, legendary: 3, mythical: 4 };
        list.sort((a, b) => (order[a.rarity] || 0) - (order[b.rarity] || 0));
    }

    grid.innerHTML = list.map(skin => `
        <div class="shop-item ${getRarityClass(skin.rarity)}">
            ${renderSkinIcon(skin)}
            <div class="name">${skin.name}</div>
            <div class="rarity-label">${(RARITIES[skin.rarity] || {}).name || skin.rarity}</div>
            <div class="price-row">
                <span class="price">${formatMoney(skin.price)}</span>
            </div>
            <button class="buy-btn" data-id="${skin.id}" ${state.balance < skin.price ? 'disabled' : ''}>
                Купити
            </button>
        </div>
    `).join('');

    grid.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => handleBuy(btn.dataset.id));
    });
}

async function handleBuy(skinId) {
    if (!state.isLoggedIn) {
        showToast('Спочатку увійди', 'lose');
        return;
    }

    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return;

    if (state.balance < skin.price) {
        showToast('Недостатньо коштів', 'lose');
        return;
    }

    // Модалка підтвердження
    const modal = $('#buyModal');
    if (modal) {
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
}

// ====================== INVENTORY ======================
function renderInventory() {
    const grid = $('#inventory');
    if (!grid) return;

    let list = [...state.inventory];

    if (state.invFilter !== 'all') {
        list = list.filter(item => item.rarity === state.invFilter);
    }

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

    // Оновлення лічильників
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

async function handleSellAll() {
    if (!state.isLoggedIn || state.inventory.length === 0) return;

    if (!confirm('Продати всі предмети?')) return;

    try {
        const result = await sellAllSkins();
        state.balance = result.balance;
        state.inventory = result.inventory || [];

        updateBalanceUI();
        renderInventory();
        renderUpgradeInventory();
        showToast('Все продано', 'win');
    } catch (err) {
        showToast(err.message || 'Помилка', 'lose');
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
            const uid = el.dataset.uid;
            const item = state.inventory.find(i => i.uid === uid);
            if (item) selectSource(item);
        });
    });

    const countEl = $('#invPanelCount');
    if (countEl) countEl.textContent = `${state.inventory.length} шт.`;
}

function renderUpgradeTargets() {
    const grid = $('#itemsPanelGrid');
    if (!grid || typeof SKINS === 'undefined') return;

    // Показуємо тільки предмети дорожчі за вибраний source
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
            const id = el.dataset.id;
            const skin = SKINS.find(s => s.id === id);
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
        slot.innerHTML = `
            ${renderSkinIcon(item)}
            <div class="upg-item-name">${item.name}</div>
            <div class="upg-item-rarity">${(RARITIES[item.rarity] || {}).name || ''}</div>
        `;
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
        slot.innerHTML = `
            ${renderSkinIcon(skin)}
            <div class="upg-item-name">${skin.name}</div>
            <div class="upg-item-rarity">${(RARITIES[skin.rarity] || {}).name || ''}</div>
        `;
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
        slot.innerHTML = `
            <div class="upg-item-empty">
                <div class="upg-item-empty-icon">+</div>
                <div class="upg-item-empty-text">Вибрати предмет</div>
            </div>
        `;
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
        slot.innerHTML = `
            <div class="upg-item-empty">
                <div class="upg-item-empty-icon">?</div>
                <div class="upg-item-empty-text">Ціль</div>
            </div>
        `;
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

    // Тільки для відображення (реальний шанс рахує сервер)
    const chance = Math.min(95, Math.max(1, (state.selectedSource.price / state.selectedTarget.price) * 100));
    const display = chance.toFixed(1);

    if (percentEl) percentEl.textContent = display + '%';
    if (statusEl) statusEl.textContent = 'ГОТОВО';
    if (btn) btn.disabled = false;

    if (sector) {
        const circ = 2 * Math.PI * 100;
        const offset = circ * (1 - chance / 100);
        sector.setAttribute('stroke-dasharray', `${circ - offset} ${circ}`);
    }
}

async function handleUpgrade() {
    if (state.isUpgrading) return;
    if (!state.selectedSource || !state.selectedTarget) return;
    if (!state.isLoggedIn) {
        showToast('Спочатку увійди', 'lose');
        return;
    }

    state.isUpgrading = true;
    const btn = $('#upgradeBtn');
    if (btn) btn.disabled = true;

    try {
        const result = await doUpgrade(state.selectedSource.uid, state.selectedTarget.id);

        // Анімація (візуальна)
        await animateUpgrade(result.chance, result.success);

        // Оновлюємо стан ТІЛЬКИ з відповіді сервера
        state.balance = result.balance;
        state.inventory = result.inventory || [];

        updateBalanceUI();
        renderInventory();
        renderUpgradeInventory();
        clearSource();
        clearTarget();

        if (result.success) {
            showResultModal(true, result.wonItem);
        } else {
            showResultModal(false);
        }

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
        if (!needle) {
            resolve();
            return;
        }

        const duration = state.spinSpeed === 'fast' ? 1200 : 2800;
        const targetAngle = success
            ? Math.random() * (chance / 100) * 360
            : chance / 100 * 360 + Math.random() * (360 - chance / 100 * 360);

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
    const icon = $('#resultIcon');

    if (win && item) {
        title.textContent = 'ПЕРЕМОГА';
        title.className = 'result-title result-win';
        value.textContent = '+' + formatMoney(item.price);
        if (icon) icon.textContent = '◆';
    } else {
        title.textContent = 'НЕВДАЧА';
        title.className = 'result-title result-lose';
        value.textContent = '—';
        if (icon) icon.textContent = '✕';
    }

    modal.classList.add('show');
}

// ====================== AUTH ======================
async function initAuth() {
    // Firebase вже ініціалізований у HTML
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
                updateProfitUI(data.profit || 0);
                updateLevelUI(data.level || 1, data.xp || 0);
                renderInventory();
                renderUpgradeInventory();
                renderShop();
            } catch (err) {
                console.error('Failed to load user:', err);
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

    // Google login
    const googleBtn = $('#googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try {
                await window.fbSignInWithPopup(auth, window.fbGoogleProvider);
                $('#authModal')?.classList.remove('show');
            } catch (err) {
                $('#authError').textContent = err.message || 'Помилка входу';
            }
        });
    }

    // Steam login
    const steamBtn = $('#steamLoginBtn');
    if (steamBtn) {
        steamBtn.addEventListener('click', () => {
            window.location.href = `${API_BASE}/steam-auth`;
        });
    }

    // Обробка steam_token з URL
    const params = new URLSearchParams(window.location.search);
    const steamToken = params.get('steam_token');
    if (steamToken) {
        try {
            await window.fbSignInWithCustomToken(auth, steamToken);
            // Чистимо URL
            window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
            console.error('Steam token error:', err);
            showToast('Помилка Steam-входу', 'lose');
        }
    }
}

// ====================== NAVIGATION ======================
function initNavigation() {
    $$('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            $$('.nav-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const page = tab.dataset.page;
            $$('.page').forEach(p => p.classList.remove('active'));
            const target = $(`#page-${page}`);
            if (target) target.classList.add('active');

            if (page === 'shop') renderShop();
            if (page === 'inventory') renderInventory();
            if (page === 'upgrade') {
                renderUpgradeInventory();
                renderUpgradeTargets();
            }
        });
    });
}

// ====================== FILTERS ======================
function initFilters() {
    // Shop filters
    $$('.shop-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.shop-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.shopFilter = btn.dataset.rarity || 'all';
            renderShop();
        });
    });

    const sortSelect = $('#shopSort');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            state.shopSort = sortSelect.value;
            renderShop();
        });
    }

    // Inventory filters
    $$('.inv-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.inv-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.invFilter = btn.dataset.rarity || 'all';
            renderInventory();
        });
    });

    const sellAllBtn = $('#sellAllBtn');
    if (sellAllBtn) {
        sellAllBtn.addEventListener('click', handleSellAll);
    }
}

// ====================== UPGRADE UI EVENTS ======================
function initUpgradeUI() {
    const sourceRemove = $('#sourceRemoveBtn');
    if (sourceRemove) sourceRemove.addEventListener('click', clearSource);

    const targetRemove = $('#targetRemoveBtn');
    if (targetRemove) targetRemove.addEventListener('click', clearTarget);

    const upgradeBtn = $('#upgradeBtn');
    if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgrade);

    // Speed buttons
    const slowBtn = $('#speedSlowBtn');
    const fastBtn = $('#speedFastBtn');
    if (slowBtn) {
        slowBtn.addEventListener('click', () => {
            state.spinSpeed = 'slow';
            slowBtn.classList.add('active');
            fastBtn?.classList.remove('active');
        });
    }
    if (fastBtn) {
        fastBtn.addEventListener('click', () => {
            state.spinSpeed = 'fast';
            fastBtn.classList.add('active');
            slowBtn?.classList.remove('active');
        });
    }

    // Result modal continue
    const continueBtn = $('#resultContinue');
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            $('#resultModal')?.classList.remove('show');
        });
    }
}

// ====================== USER BADGE / LOGOUT ======================
function initUserBadge() {
    const badge = $('#userBadge');
    if (!badge) return;

    badge.addEventListener('click', () => {
        if (state.isLoggedIn) {
            $('#logoutModal')?.classList.add('show');
        } else {
            $('#authModal')?.classList.add('show');
        }
    });

    const logoutConfirm = $('#logoutConfirm');
    if (logoutConfirm) {
        logoutConfirm.addEventListener('click', async () => {
            try {
                await window.fbSignOut(window.fbAuth);
                $('#logoutModal')?.classList.remove('show');
                showToast('Вийшов з акаунту');
            } catch (err) {
                showToast('Помилка виходу', 'lose');
            }
        });
    }

    const logoutCancel = $('#logoutCancel');
    if (logoutCancel) {
        logoutCancel.addEventListener('click', () => {
            $('#logoutModal')?.classList.remove('show');
        });
    }
}

// ====================== INIT ======================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFilters();
    initUpgradeUI();
    initUserBadge();
    initAuth();

    // Початковий рендер магазину
    if (typeof SKINS !== 'undefined') {
        renderShop();
        renderUpgradeTargets();
    }
});
