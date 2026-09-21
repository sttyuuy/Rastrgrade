/* ============================================================
   RASTRGRADE v37 — ФИНАЛ
   Все баги исправлены:
   - Бонус-пикер = модальное окно с сеткой
   - Кнопка "Выйти" = своё модальное окно
   - Звуки без лагов
   - Топ→топ + бонус
   - Защита от двойного клика
   ============================================================ */

function getShopPrice(skin) { return Math.ceil(skin.price * 1.15); }

const PRESETS = [
    { mult: 1.5, label: 'x1.5' },
    { mult: 2,   label: 'x2'   },
    { mult: 3,   label: 'x3'   },
    { mult: 5,   label: 'x5'   },
    { mult: 10,  label: 'x10'  },
    { mult: 20,  label: 'x20'  },
    { mult: 50,  label: 'x50'  },
    { mult: 100, label: 'x100' },
    { mult: 500, label: 'x500' }
];

const LEVELS = [
    {lvl:1,xp:0,name:'НОВИЧОК'},{lvl:2,xp:1000,name:'ЛЮБИТЕЛЬ'},
    {lvl:3,xp:5000,name:'ИГРОК'},{lvl:4,xp:15000,name:'ПРОФИ'},
    {lvl:5,xp:40000,name:'ЭКСПЕРТ'},{lvl:6,xp:100000,name:'МАСТЕР'},
    {lvl:7,xp:250000,name:'ГУРУ'},{lvl:8,xp:500000,name:'ЛЕГЕНДА'},
    {lvl:9,xp:1000000,name:'ТИТАН'},{lvl:10,xp:2500000,name:'БОГ КАЗИНО'}
];

/* ============================================================
   FIREBASE
   ============================================================ */
var currentUser = null;
var cloudSaveTimer = null;

function setupFirebase() {
    if (!window.fbReady) { setTimeout(setupFirebase, 100); return; }

    window.fbOnAuthStateChanged(window.fbAuth, async function(user) {
        if (user) {
            currentUser = { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
            closeAuthModal();
            resetStateToDefault();
            await loadFromCloud();
            renderAll();
            updateUserBadge();
            log('👤 Добро пожаловать, ' + (user.displayName || user.email) + '!', 'win');
        } else {
            currentUser = null;
            resetStateToDefault();
            renderAll();
            updateUserBadge();
            openAuthModal();
        }
    });

    var googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async function() {
            try { await window.fbSignInWithPopup(window.fbAuth, window.fbGoogleProvider); }
            catch(e) {
                console.error('Google login error:', e);
                var errEl = document.getElementById('authError');
                if (errEl) {
                    if (e.code === 'auth/popup-blocked') errEl.textContent = 'Браузер заблокировал окно.';
                    else if (e.code === 'auth/unauthorized-domain') errEl.textContent = 'Домен не добавлен в Firebase.';
                    else errEl.textContent = 'Ошибка: ' + (e.message || e.code);
                }
            }
        });
    }
}

async function loadFromCloud() {
    if (!currentUser || !window.fbDb) return;
    try {
        var ref = window.fbDoc(window.fbDb, 'users', currentUser.uid);
        var snap = await window.fbGetDoc(ref);
        if (snap.exists()) {
            var s = snap.data();
            Object.keys(s).forEach(function(k){ state[k] = s[k]; });
            state.inventory = (state.inventory||[]).map(resolveSkin).filter(Boolean);
            if (state.bestDrop) state.bestDrop = resolveSkin(state.bestDrop);
            if (state.bestUpgrade) state.bestUpgrade = resolveSkin(state.bestUpgrade);
        } else {
            state.balance = START_BALANCE;
            await saveToCloud();
        }
    } catch(e) {
        console.error('Load from cloud failed:', e);
        state.balance = START_BALANCE;
    }
}

async function saveToCloud() {
    if (!currentUser || !window.fbDb) return;
    try {
        var data = {
            balance: state.balance,
            inventory: state.inventory.map(function(i){ return {id:i.id, rarity:i.rarity}; }),
            profit: state.profit,
            totalWon: state.totalWon, totalLost: state.totalLost,
            upgrades: state.upgrades, purchases: state.purchases,
            bestDrop: state.bestDrop ? {id:state.bestDrop.id, rarity:state.bestDrop.rarity} : null,
            bestUpgrade: state.bestUpgrade ? {id:state.bestUpgrade.id, rarity:state.bestUpgrade.rarity} : null,
            housePlayerLost: state.housePlayerLost, houseCasinoWon: state.houseCasinoWon,
            xp: state.xp, level: state.level,
            soundOn: state.soundOn,
            shopFilter: state.shopFilter, shopSort: state.shopSort,
            spinSpeed: state.spinSpeed,
            updatedAt: Date.now()
        };
        var ref = window.fbDoc(window.fbDb, 'users', currentUser.uid);
        await window.fbSetDoc(ref, data);
    } catch(e) { console.error('Save to cloud failed:', e); }
}

function save() {
    if (!currentUser) return;
    if (cloudSaveTimer) clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(saveToCloud, 800);
}

/* ============ ФИКС #3: СВОЁ МОДАЛЬНОЕ ОКНО ВЫХОДА ============ */
function openLogoutModal() {
    var m = document.getElementById('logoutModal');
    if (m) m.classList.add('show');
}
function closeLogoutModal() {
    var m = document.getElementById('logoutModal');
    if (m) m.classList.remove('show');
}
async function confirmLogout() {
    closeLogoutModal();
    try {
        await saveToCloud();
        await window.fbSignOut(window.fbAuth);
        log('👋 Вы вышли из аккаунта', 'info');
    } catch(e) { console.error(e); }
}

function updateUserBadge() {
    var badge = document.getElementById('userBadge');
    var icon = document.getElementById('userBadgeIcon');
    if (!badge || !icon) return;
    if (currentUser) { badge.title = 'Выйти'; icon.textContent = '🚪'; }
    else { badge.title = 'Войти'; icon.textContent = '👤'; }
}

function openAuthModal() { var m = document.getElementById('authModal'); if (m) m.classList.add('show'); }
function closeAuthModal() { var m = document.getElementById('authModal'); if (m) m.classList.remove('show'); }

/* ============================================================
   STATE
   ============================================================ */
var state = {
    balance: 0, inventory: [], profit: 0,
    totalWon: 0, totalLost: 0, upgrades: 0, purchases: 0,
    bestDrop: null, bestUpgrade: null,
    upgradeSource: null, upgradeTarget: null, selectedPreset: null,
    bonusSkin: null,
    spinSpeed: 'slow',
    housePlayerLost: 0, houseCasinoWon: 0,
    xp: 0, level: 1,
    soundOn: true,
    shopFilter: 'all', shopSort: 'price-asc',
    invPanelFilter: 'all', itemsPanelFilter: 'all',
    upgrading: false
};

function resetStateToDefault() {
    state.balance = 0; state.inventory = []; state.profit = 0;
    state.totalWon = 0; state.totalLost = 0; state.upgrades = 0; state.purchases = 0;
    state.bestDrop = null; state.bestUpgrade = null;
    state.upgradeSource = null; state.upgradeTarget = null; state.selectedPreset = null;
    state.bonusSkin = null;
    state.spinSpeed = 'slow';
    state.housePlayerLost = 0; state.houseCasinoWon = 0;
    state.xp = 0; state.level = 1;
    state.shopFilter = 'all'; state.shopSort = 'price-asc';
    state.invPanelFilter = 'all'; state.itemsPanelFilter = 'all';
    state.upgrading = false;
}

function $(id){ return document.getElementById(id); }

/* ============================================================
   ФИКС #2: ЗВУКИ БЕЗ ЛАГОВ
   Простая логика: играем звук, если уже играет другой — останавливаем старый
   ============================================================ */
const SOUND_FILES = {
    spin: 'spin.mp3', win_common: 'win_common.mp3', win_legendary: 'win_legendary.mp3',
    lose: 'lose.mp3', click: 'click.mp3', buy: 'buy.mp3', levelup: 'levelup.mp3'
};
var SOUNDS = {};
var audioReady = false;
var _currentSound = null;

function preloadSounds() {
    Object.keys(SOUND_FILES).forEach(function(key){
        var a = new Audio();
        a.src = SOUND_FILES[key];
        a.preload = 'auto';
        a.volume = 0.7;
        a.load();
        SOUNDS[key] = a;
    });
}
function unlockAudio() {
    if (audioReady) return;
    audioReady = true;
    Object.keys(SOUNDS).forEach(function(key){
        var s = SOUNDS[key];
        if (!s) return;
        s.volume = 0;
        s.play().then(function(){ s.pause(); s.currentTime = 0; s.volume = 0.7; }).catch(function(){});
    });
}
/* ФИКС #2: играем через клон, но НЕ перекрываем */
function playSound(name, vol) {
    if (!state.soundOn) return;
    var src = SOUNDS[name]; if (!src) return;
    try {
        var c = src.cloneNode();
        c.volume = vol || 0.7;
        c.play().catch(function(){});
        c.onended = function(){ c = null; };
    } catch(e) {}
}
function sClick(){ playSound('click', 0.6); }
function sWin(r){
    if (r === 'legendary' || r === 'mythical') playSound('win_legendary', 0.9);
    else playSound('win_common', 0.8);
}
function sLose(){ playSound('lose', 0.8); }
function sBuy(){ playSound('buy', 0.8); }
function sLevelUp(){ playSound('levelup', 0.9); }

/* Циклический звук для апгрейда */
var _loopAudio = {};
function startLoopSound(name, vol) {
    if (!state.soundOn) return null;
    var src = SOUNDS[name]; if (!src) return null;
    if (_loopAudio[name]) { try { _loopAudio[name].pause(); } catch(e){} }
    var c = src.cloneNode();
    c.volume = vol || 0.6;
    c.loop = true;
    c.play().catch(function(){});
    _loopAudio[name] = c;
    return {
        stop: function() { if (_loopAudio[name]) { try { _loopAudio[name].pause(); } catch(e){} _loopAudio[name] = null; } },
        fadeStop: function(duration) {
            duration = duration || 800;
            var audio = _loopAudio[name];
            if (!audio) return;
            var startVol = audio.volume;
            var startTime = performance.now();
            var iv = setInterval(function(){
                var t = (performance.now() - startTime) / duration;
                if (t >= 1) { clearInterval(iv); try { audio.pause(); } catch(e){} _loopAudio[name] = null; return; }
                audio.volume = Math.max(0, startVol * (1 - t));
            }, 50);
        }
    };
}
function stopAllLoopSounds() {
    Object.keys(_loopAudio).forEach(function(k){
        if (_loopAudio[k]) { try { _loopAudio[k].pause(); } catch(e){} _loopAudio[k] = null; }
    });
}
function startUpgradeSound(duration) {
    duration = duration || 4000;
    var h = startLoopSound('spin', 0.55);
    if (!h) return null;
    setTimeout(function() { h.fadeStop(800); }, duration - 800);
    return h;
}
preloadSounds();

/* ============ ЛОГ ============ */
function log(msg, type) {
    type = type || 'info';
    var wrap = $('toastWrap'); if (!wrap) return;
    while (wrap.children.length >= 5) wrap.removeChild(wrap.firstChild);
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<span class="toast-icon">' + (type==='win'?'✅':type==='lose'?'❌':type==='jackpot'?'🔥':'ℹ️') + '</span><span>' + msg + '</span>';
    wrap.appendChild(el);
    setTimeout(function() {
        el.style.transition = 'all 0.4s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(120%)';
        setTimeout(function(){ el.remove(); }, 400);
    }, 3500);
}

/* ============ УТИЛИТЫ ============ */
function findTargetByPrice(targetPrice, sourceSkin) {
    var best = null, bestDiff = Infinity;
    SKINS.forEach(function(s){
        if (sourceSkin && s.id === sourceSkin.id) return;
        if (sourceSkin && s.price <= sourceSkin.price) return;
        var d = Math.abs(s.price - targetPrice);
        if (d < bestDiff) { bestDiff = d; best = s; }
    });
    return best;
}
function calcRealChance(sourcePrice, targetPrice) {
    var chance = (sourcePrice / targetPrice) * 100;
    if (chance > 95) chance = 95;
    if (chance < 0.01) chance = 0.01;
    return chance;
}
/* ФИКС #10: логируем КАЖДЫЙ уровень */
function addXP(n) {
    state.xp += n;
    var prev = state.level;
    for (var i = LEVELS.length - 1; i >= 0; i--) { if (state.xp >= LEVELS[i].xp) { state.level = LEVELS[i].lvl; break; } }
    if (state.level > prev) {
        for (var lvl = prev + 1; lvl <= state.level; lvl++) {
            var reward = lvl * usdToRastr(11);
            state.balance += reward;
            log('⬆️ Уровень ' + lvl + '! +' + formatRastr(reward), 'win');
        }
        sLevelUp();
    }
}
function resetUpgradeSlots() {
    state.upgradeSource = null; state.upgradeTarget = null; state.selectedPreset = null;
    state.bonusSkin = null;
    renderSourceSlot(); renderTargetSlot(); renderPresets();
    updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
    setNeedleAngle(0);
    if (DOM.upgradeBtn) DOM.upgradeBtn.disabled = true;
}

/* ============ DOM CACHE ============ */
var DOM = {};
function cacheDom() {
    ['balance','profit','invCount','invValue','statTotalWon','statTotalLost',
     'statUpgrades','statPurchases','statBestDrop','statBestUpgrade',
     'housePlayer','houseCasino','levelBadge','levelName','levelBarFill',
     'sourcePriceLabel','targetPriceLabel','sourceSlot','targetSlot',
     'sourceRemoveBtn','targetRemoveBtn','circlePercent','circleStatus',
     'presetContainer','invPanelCount','invPanelList','targetsCount',
     'itemsPanelGrid','invSearch','itemsSearch','upgradeBtn',
     'speedSlowBtn','speedFastBtn','userBadge']
    .forEach(function(id){ DOM[id] = $(id); });
    DOM.shopBalance = $('shopBalance');
}
cacheDom();

function updateUI() {
    if (!DOM.balance) return;
    DOM.balance.textContent = formatRastr(state.balance);
    if (DOM.shopBalance) DOM.shopBalance.textContent = formatRastr(state.balance);
    var p = DOM.profit;
    p.textContent = (state.profit >= 0 ? '+' : '') + formatRastr(state.profit);
    p.className = 'hud-stat-value ' + (state.profit >= 0 ? 'green' : 'red');
    DOM.invCount.textContent = state.inventory.length;
    DOM.invValue.textContent = formatRastr(state.inventory.reduce(function(s,i){return s+i.price},0));
    DOM.statTotalWon.textContent = formatRastr(state.totalWon);
    DOM.statTotalLost.textContent = formatRastr(state.totalLost);
    DOM.statUpgrades.textContent = state.upgrades;
    DOM.statPurchases.textContent = state.purchases;
    DOM.statBestDrop.textContent = state.bestDrop ? state.bestDrop.name + ' ' + formatRastr(state.bestDrop.price) : '—';
    DOM.statBestUpgrade.textContent = state.bestUpgrade ? state.bestUpgrade.name + ' ' + formatRastr(state.bestUpgrade.price) : '—';
    DOM.housePlayer.textContent = formatRastr(state.housePlayerLost);
    DOM.houseCasino.textContent = formatRastr(state.houseCasinoWon);
    DOM.levelBadge.textContent = state.level;
    var lvlIdx = LEVELS.findIndex(function(l){return l.lvl===state.level});
    var lvl = LEVELS[lvlIdx]; var next = LEVELS[lvlIdx+1];
    DOM.levelName.textContent = lvl.name;
    if (next) {
        var progress = (state.xp - lvl.xp) / (next.xp - lvl.xp) * 100;
        DOM.levelBarFill.style.width = Math.min(100, Math.max(0, progress)) + '%';
    } else DOM.levelBarFill.style.width = '100%';
    save();
}

/* ============ RESULT ============ */
function showResult(o) {
    var inner = $('resultInner');
    inner.className = 'modal-inner result-inner ' + o.type;
    if (o.skin) {
        $('resultIcon').innerHTML = '';
        $('resultIcon').style.display = 'none';
        $('resultSkin').innerHTML =
            '<div class="item ' + o.skin.rarity + '" style="margin:0 auto;display:inline-flex;border:none;background:transparent;min-width:auto;height:auto;padding:0">' +
                renderSkinIcon(o.skin) +
                '<div style="margin-top:12px"><div class="name" style="font-size:0.85rem">' + o.skin.name + '</div><div class="price" style="font-size:1rem;margin-top:6px">' + formatRastr(o.skin.price) + '</div></div>' +
            '</div>';
    } else {
        $('resultIcon').textContent = o.icon;
        $('resultIcon').style.display = 'block';
        $('resultSkin').innerHTML = '';
    }
    $('resultTitle').textContent = o.title;
    $('resultValue').innerHTML = o.value;
    var sellBtn = $('resultSell');
    if (o.canSell && o.skin) {
        sellBtn.style.display = 'inline-block';
        sellBtn.onclick = function() { if (o.sellCallback) o.sellCallback(); closeResult(); };
    } else sellBtn.style.display = 'none';
    if (o.type === 'result-win' || o.type === 'result-jackpot') {
        var wrap = $('resultParticles'); wrap.innerHTML = '';
        var colors = o.type === 'result-jackpot' ? ['#f5c542','#ffdd88','#ff6b1a'] : ['#00e676','#4aa8ff','#a55cff'];
        for (var i = 0; i < 20; i++) {
            var p = document.createElement('div'); p.className = 'particle';
            var angle = Math.random() * Math.PI * 2;
            var dist = 120 + Math.random() * 180;
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.left = '50%'; p.style.top = '50%';
            p.style.animationDelay = (Math.random() * 0.4) + 's';
            wrap.appendChild(p);
        }
    }
    $('resultModal').classList.add('show');
}
function closeResult() { sClick(); $('resultModal').classList.remove('show'); }

/* ============ UPGRADE ============ */
var CIRCLE_RADIUS = 100;
var CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function drawChanceSector(chance) {
    chance = Math.max(0, Math.min(100, chance));
    var len = (chance / 100) * CIRCLE_CIRCUMFERENCE;
    $('chanceSector').setAttribute('stroke-dasharray', len + ' ' + CIRCLE_CIRCUMFERENCE);
    var color;
    if (chance >= 65) color = '#7ed321';
    else if (chance >= 35) color = '#f5c542';
    else if (chance >= 15) color = '#ff6b1a';
    else color = '#ff3b3b';
    $('chanceSector').style.color = color;
}
function setNeedleAngle(deg) { $('circleNeedle').style.transform = 'rotate(' + deg + 'deg)'; }
function updateCircleChance(chance, statusText, statusClass) {
    drawChanceSector(chance);
    $('circlePercent').textContent = Math.round(chance) + '%';
    var s = $('circleStatus');
    s.textContent = statusText || '';
    s.className = 'upg-status ' + (statusClass || '');
    var color;
    if (chance >= 65) color = '#7ed321';
    else if (chance >= 35) color = '#f5c542';
    else if (chance >= 15) color = '#ff6b1a';
    else color = '#ff3b3b';
    $('circlePercent').style.color = color;
}

function renderSourceSlot() {
    var slot = $('sourceSlot'); if (!slot) return;
    if (state.upgradeSource) {
        slot.className = 'upg-item-slot filled ' + state.upgradeSource.rarity;
        slot.innerHTML = renderSkinIcon(state.upgradeSource) + '<div class="upg-item-name">' + state.upgradeSource.name + '</div><div class="upg-item-rarity" style="color:' + RARITIES[state.upgradeSource.rarity].color + '">' + RARITIES[state.upgradeSource.rarity].name + '</div>';
        $('sourcePriceLabel').textContent = formatRastr(state.upgradeSource.price);
        $('sourceRemoveBtn').style.display = 'block';
    } else {
        slot.className = 'upg-item-slot';
        slot.innerHTML = '<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Выбрать предмет</div></div>';
        $('sourcePriceLabel').textContent = '—';
        $('sourceRemoveBtn').style.display = 'none';
    }
}

function renderTargetSlot() {
    var slot = $('targetSlot'); if (!slot) return;
    if (state.upgradeTarget) {
        slot.className = 'upg-item-slot filled ' + state.upgradeTarget.rarity;
        slot.innerHTML = renderSkinIcon(state.upgradeTarget) + '<div class="upg-item-name">' + state.upgradeTarget.name + '</div><div class="upg-item-rarity" style="color:' + RARITIES[state.upgradeTarget.rarity].color + '">' + RARITIES[state.upgradeTarget.rarity].name + '</div>';
        $('targetPriceLabel').textContent = formatRastr(state.upgradeTarget.price);
        $('targetRemoveBtn').style.display = 'block';
    } else {
        slot.className = 'upg-item-slot';
        slot.innerHTML = '<div class="upg-item-empty"><div class="upg-item-empty-icon">?</div><div class="upg-item-empty-text">Цель</div></div>';
        $('targetPriceLabel').textContent = '—';
        $('targetRemoveBtn').style.display = 'none';
    }
}

function updateCircleFromPreset() {
    if (!state.upgradeSource || !state.upgradeTarget) {
        updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
        setNeedleAngle(0);
        DOM.upgradeBtn.disabled = true;
        return;
    }
    var chance = calcRealChance(state.upgradeSource.price, state.upgradeTarget.price);
    state.upgradeTarget._realChance = chance;
    var status, statusClass;
    if (chance >= 60) { status = 'ВЫСОКИЙ ШАНС'; statusClass = 'win'; }
    else if (chance >= 30) { status = 'СРЕДНИЙ ШАНС'; statusClass = ''; }
    else if (chance >= 10) { status = 'РИСК'; statusClass = ''; }
    else if (chance >= 1) { status = 'ХАЙ РИСК'; statusClass = 'lose'; }
    else { status = 'ПОЧТИ НЕВОЗМОЖНО'; statusClass = 'lose'; }
    updateCircleChance(chance, status, statusClass);
    setNeedleAngle(0);
    DOM.upgradeBtn.disabled = false;
}

function renderPresets() {
    var container = $('presetContainer'); if (!container) return;
    var frag = document.createDocumentFragment();
    var hasSource = !!state.upgradeSource;
    PRESETS.forEach(function(p, idx) {
        var btn = document.createElement('button');
        btn.className = 'upg-preset-btn';
        btn.disabled = !hasSource;
        btn.dataset.idx = idx;
        var displayText = '—';
        if (hasSource) {
            var sourcePrice = state.upgradeSource.price;
            var desiredTargetPrice = sourcePrice * p.mult;
            var target = findTargetByPrice(desiredTargetPrice, state.upgradeSource);
            if (target && target.price > sourcePrice) {
                var realChance = calcRealChance(sourcePrice, target.price);
                if (realChance >= 10) displayText = Math.round(realChance) + '%';
                else displayText = realChance.toFixed(2) + '%';
            }
        }
        btn.innerHTML = '<span class="upg-preset-mult">' + p.label + '</span><span class="upg-preset-chance">' + displayText + '</span>';
        if (state.selectedPreset === idx) btn.classList.add('active');
        btn.addEventListener('click', function() { selectPreset(idx); });
        frag.appendChild(btn);
    });
    container.replaceChildren(frag);
}

function selectPreset(idx) {
    if (!state.upgradeSource) { log('❌ Сначала выбери предмет', 'lose'); sClick(); return; }
    unlockAudio(); sClick();
    var p = PRESETS[idx];
    var sourcePrice = state.upgradeSource.price;
    var desiredTargetPrice = sourcePrice * p.mult;
    var target = findTargetByPrice(desiredTargetPrice, state.upgradeSource);
    if (!target || target.price <= sourcePrice) {
        log('❌ Нет подходящей цели дороже твоего предмета', 'lose');
        sClick();
        return;
    }
    state.upgradeTarget = target;
    state.selectedPreset = idx;
    state.upgradeTarget._realChance = calcRealChance(sourcePrice, target.price);
    renderTargetSlot(); renderPresets(); updateCircleFromPreset();
}

/* ============ INVENTORY PANEL ============ */
function renderInvPanel() {
    var list = $('invPanelList'); if (!list) return;
    var filter = state.invPanelFilter;
    var search = ($('invSearch').value || '').toLowerCase();
    var sorted = state.inventory.slice().sort(function(a,b) { return b.price - a.price; });
    if (filter !== 'all') sorted = sorted.filter(function(s) { return s.rarity === filter; });
    if (search) sorted = sorted.filter(function(s) { return s.name.toLowerCase().indexOf(search) >= 0; });
    $('invPanelCount').textContent = state.inventory.length + ' шт.';
    if (sorted.length === 0) { list.innerHTML = '<div class="upg-inv-empty">Инвентарь пуст</div>'; return; }
    var frag = document.createDocumentFragment();
    sorted.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'upg-inv-item ' + skin.rarity;
        if (state.upgradeSource && state.upgradeSource === skin) el.classList.add('used');
        el.innerHTML = renderSkinIcon(skin) + '<div class="upg-inv-name">' + skin.name + '</div><div class="upg-inv-price">' + formatRastr(skin.price) + '</div>';
        el.addEventListener('click', function() {
            unlockAudio(); sClick();
            state.upgradeSource = skin;
            state.upgradeTarget = null; state.selectedPreset = null;
            state.bonusSkin = null;
            renderSourceSlot(); renderTargetSlot(); renderInvPanel(); renderPresets(); updateCircleFromPreset();
        });
        frag.appendChild(el);
    });
    list.replaceChildren(frag);
}

/* ============ ФИКС #5: isTopSkin более гибкий ============ */
function isTopSkin(skin) {
    if (!skin) return false;
    var maxPrice = Math.max.apply(null, SKINS.map(function(s){return s.price;}));
    // Топ-скин = входит в топ-5 самых дорогих
    var sorted = SKINS.slice().sort(function(a,b){return b.price - a.price;});
    var top5 = sorted.slice(0, 5);
    return top5.some(function(s){ return s.id === skin.id; });
}

/* ============ ФИКС #1: БОНУС-ПИКЕР = МОДАЛЬНОЕ ОКНО ============ */
function openBonusPicker() {
    var modal = $('bonusModal');
    var grid = $('bonusGrid');
    if (!modal || !grid) return;

    // Показываем только скины ДЕШЕВЛЕ source
    var sourcePrice = state.upgradeSource ? state.upgradeSource.price : Infinity;
    var pool = SKINS.filter(function(s){
        return s.price < sourcePrice && (!state.upgradeSource || s.id !== state.upgradeSource.id);
    }).sort(function(a,b){ return a.price - b.price; });

    if (pool.length === 0) {
        log('❌ Нет скинов для бонуса', 'lose');
        return;
    }

    var frag = document.createDocumentFragment();
    pool.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'bonus-item ' + skin.rarity;
        el.innerHTML = renderSkinIcon(skin) + '<div class="bonus-name">' + skin.name + '</div><div class="bonus-price">' + formatRastr(skin.price) + '</div>';
        el.addEventListener('click', function() {
            state.bonusSkin = skin;
            sClick();
            closeBonusPicker();
            log('🎁 Бонус: ' + skin.name, 'info');
            renderTargetSlot();
        });
        frag.appendChild(el);
    });
    grid.replaceChildren(frag);
    modal.classList.add('show');
}

function closeBonusPicker() {
    var modal = $('bonusModal');
    if (modal) modal.classList.remove('show');
}

function pickRandomBonus() {
    var sourcePrice = state.upgradeSource ? state.upgradeSource.price : Infinity;
    var pool = SKINS.filter(function(s){
        return s.price < sourcePrice && (!state.upgradeSource || s.id !== state.upgradeSource.id);
    });
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

/* ============ ФИКС #7: подсветка выбранной цели ============ */
function renderItemsPanel() {
    var grid = $('itemsPanelGrid'); if (!grid) return;
    var filter = state.itemsPanelFilter;
    var search = ($('itemsSearch').value || '').toLowerCase();
    var items = SKINS.slice();
    if (filter !== 'all') items = items.filter(function(s) { return s.rarity === filter; });
    if (search) items = items.filter(function(s) { return s.name.toLowerCase().indexOf(search) >= 0; });
    $('targetsCount').textContent = items.length;
    if (items.length === 0) { grid.innerHTML = '<div class="upg-inv-empty" style="grid-column:1/-1">Ничего не найдено</div>'; return; }
    var frag = document.createDocumentFragment();
    items.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'upg-target-item ' + skin.rarity;
        // ФИКС #7: подсветка выбранной цели
        if (state.upgradeTarget && state.upgradeTarget.id === skin.id) {
            el.style.borderColor = '#f5c542';
            el.style.boxShadow = '0 0 20px rgba(245,197,66,0.5)';
        }
        el.innerHTML = renderSkinIcon(skin) + '<div class="upg-target-name">' + skin.name + '</div><div class="upg-target-price">' + formatRastr(skin.price) + '</div>';
        el.addEventListener('click', function() {
            if (!state.upgradeSource) { log('❌ Сначала выбери свой предмет', 'lose'); sClick(); return; }

            var sourceIsTop = isTopSkin(state.upgradeSource);

            // ТОП→ТОП апгрейд
            if (skin.id === state.upgradeSource.id) {
                if (sourceIsTop) {
                    unlockAudio(); sClick();
                    state.upgradeTarget = skin;
                    state.selectedPreset = null;
                    state.upgradeTarget._realChance = 50;
                    state.bonusSkin = null;
                    openBonusPicker();
                    renderTargetSlot(); renderPresets(); updateCircleFromPreset();
                    return;
                } else {
                    log('❌ Нельзя апгрейдить предмет в самого себя', 'lose'); sClick(); return;
                }
            }

            if (skin.price <= state.upgradeSource.price) {
                log('❌ Цель должна быть дороже твоего предмета', 'lose'); sClick(); return;
            }
            unlockAudio(); sClick();
            state.upgradeTarget = skin; state.selectedPreset = null; state.bonusSkin = null;
            state.upgradeTarget._realChance = calcRealChance(state.upgradeSource.price, skin.price);
            renderTargetSlot(); renderPresets(); updateCircleFromPreset();
        });
        frag.appendChild(el);
    });
    grid.replaceChildren(frag);
}

/* ============ ANIMATION ============ */
function playUpgradeAnimation(chance, willWin) {
    return new Promise(function(resolve) {
        var duration = state.spinSpeed === 'fast' ? 2000 : 4000;
        var sectorEnd = chance * 3.6;
        var finalAngle;
        if (willWin) {
            var margin = Math.min(sectorEnd * 0.15, 8);
            finalAngle = Math.max(margin, Math.random() * (sectorEnd - margin));
        } else {
            var outsideStart = sectorEnd + 3;
            var outsideEnd = 357;
            if (outsideStart >= outsideEnd) finalAngle = (sectorEnd + 3 + Math.random() * 3) % 360;
            else finalAngle = outsideStart + Math.random() * (outsideEnd - outsideStart);
        }
        var fullSpins = state.spinSpeed === 'fast' ? 5 + Math.floor(Math.random() * 3) : 8 + Math.floor(Math.random() * 4);
        var totalRotation = fullSpins * 360 + finalAngle;
        var start = performance.now();
        var sound = startUpgradeSound(duration);
        function animate(now) {
            var t = Math.min(1, (now - start) / duration);
            var eased = 1 - Math.pow(1 - t, 4);
            setNeedleAngle(totalRotation * eased);
            if (t < 1) requestAnimationFrame(animate);
            else {
                setNeedleAngle(finalAngle);
                if (sound) sound.stop();
                var s = $('circleStatus');
                if (willWin) { s.textContent = '✅ ПОБЕДА'; s.className = 'upg-status win'; }
                else { s.textContent = '❌ ПРОВАЛ'; s.className = 'upg-status lose'; }
                setTimeout(resolve, 900);
            }
        }
        requestAnimationFrame(animate);
    });
}

/* ============ ФИКС #6: защита от двойного клика ============ */
function handleUpgrade() {
    if (!state.upgradeSource || !state.upgradeTarget) return;
    if (state.upgrading) return;
    if (state.inventory.indexOf(state.upgradeSource) < 0) { resetUpgradeSlots(); log('❌ Предмет больше не в инвентаре', 'lose'); return; }

    var sourceIsTop = isTopSkin(state.upgradeSource);
    var isTopToTop = sourceIsTop && state.upgradeTarget.id === state.upgradeSource.id;

    if (isTopToTop) {
        // Если бонус не выбран — подбираем случайный
        if (!state.bonusSkin) {
            state.bonusSkin = pickRandomBonus();
            if (!state.bonusSkin) {
                log('❌ Нет скинов для бонуса', 'lose');
                return;
            }
        }
        // ФИКС #8: бонус не может быть тем же скином
        if (state.bonusSkin.id === state.upgradeSource.id) {
            state.bonusSkin = pickRandomBonus();
        }
    } else {
        if (state.upgradeTarget.id === state.upgradeSource.id || state.upgradeTarget.price <= state.upgradeSource.price) {
            log('❌ Недопустимая цель апгрейда', 'lose');
            resetUpgradeSlots();
            return;
        }
    }

    unlockAudio();
    var btn = $('upgradeBtn');
    btn.style.pointerEvents = 'none';
    var chance = state.upgradeTarget._realChance;
    if (chance === undefined) chance = calcRealChance(state.upgradeSource.price, state.upgradeTarget.price);
    var roll = Math.random() * 100;
    var success = roll < chance;
    state.upgrading = true;
    state.upgrades++;
    btn.disabled = true;

    var sourceSkin = state.upgradeSource;
    var targetSkin = state.upgradeTarget;
    var bonusSkin = state.bonusSkin;
    var sourceValue = sourceSkin.price;
    var targetValue = targetSkin.price;

    addXP(20);

    playUpgradeAnimation(chance, success).then(function() {
        var srcIdx = state.inventory.indexOf(sourceSkin);
        if (srcIdx >= 0) state.inventory.splice(srcIdx, 1);

        if (success) {
            if (isTopToTop) {
                state.inventory.push(targetSkin);
                state.inventory.push(bonusSkin);
                state.totalWon += targetValue + bonusSkin.price;
                state.profit += targetValue + bonusSkin.price - sourceValue;
                state.houseCasinoWon += targetValue + bonusSkin.price;
                sWin('mythical');
                showResult({
                    type: 'result-jackpot', icon: '🎁', title: '🔥 ТОП → ТОП',
                    skin: targetSkin,
                    value: '+' + formatRastr(targetValue) + '<br><span style="color:#f5c542;font-size:0.95rem">🎁 БОНУС: ' + bonusSkin.name + ' (+' + formatRastr(bonusSkin.price) + ')</span>',
                    canSell: false
                });
                log('🔥 ТОП→ТОП: ' + targetSkin.name + ' + 🎁 ' + bonusSkin.name, 'jackpot');
            } else {
                state.inventory.push(targetSkin);
                state.totalWon += targetValue;
                state.profit += targetValue - sourceValue;
                state.houseCasinoWon += targetValue;
                if (!state.bestUpgrade || targetValue > state.bestUpgrade.price) state.bestUpgrade = targetSkin;
                sWin(targetSkin.rarity);
                showResult({
                    type: 'result-win', icon: '🏆', title: '✅ УСПЕХ', skin: targetSkin,
                    value: '+' + formatRastr(targetValue), canSell: true,
                    sellCallback: function() {
                        var i = state.inventory.indexOf(targetSkin);
                        if (i >= 0) { state.inventory.splice(i, 1); state.balance += targetSkin.price; updateUI(); renderInventory(); renderInvPanel(); save(); }
                    }
                });
                log('⚡ ' + sourceSkin.name + ' → ' + targetSkin.name + ' ✅', 'win');
            }
        } else {
            state.totalLost += sourceValue;
            state.profit -= sourceValue;
            state.housePlayerLost += sourceValue;
            sLose();
            showResult({
                type: 'result-lose', icon: '💀', title: '❌ ПРОВАЛ',
                skin: null, value: 'Потеряно: ' + formatRastr(sourceValue), canSell: false
            });
            log('⚡ ' + sourceSkin.name + ' → провал ❌', 'lose');
        }
        state.upgradeSource = null; state.upgradeTarget = null; state.selectedPreset = null;
        state.bonusSkin = null;
        state.upgrading = false;
        btn.style.pointerEvents = '';
        btn.disabled = true;
        renderSourceSlot(); renderTargetSlot(); renderInvPanel(); renderItemsPanel(); renderPresets();
        updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
        setNeedleAngle(0);
        updateUI(); renderInventory(); save();
    });
}

/* ============ FILTERS ============ */
function initPanelFilters(containerId, filterKey, callback) {
    var container = $(containerId); if (!container) return;
    container.innerHTML = '';
    var all = document.createElement('button');
    all.className = 'upg-inv-filter active';
    all.textContent = 'Все';
    all.dataset.filter = 'all';
    container.appendChild(all);
    Object.entries(RARITIES).forEach(function(kv) {
        var b = document.createElement('button');
        b.className = 'upg-inv-filter';
        b.textContent = kv[1].name;
        b.dataset.filter = kv[0];
        b.style.color = kv[1].color;
        container.appendChild(b);
    });
    container.querySelectorAll('.upg-inv-filter').forEach(function(b) {
        b.addEventListener('click', function() {
            unlockAudio(); sClick();
            container.querySelectorAll('.upg-inv-filter').forEach(function(x) { x.classList.remove('active'); });
            b.classList.add('active');
            state[filterKey] = b.dataset.filter;
            callback();
        });
    });
}

/* ============ SHOP ============ */
var _shopVisibleCount = 20;
var pendingPurchase = null;
var pendingQuantity = 1;

function renderShop() {
    var grid = $('shopGrid'); if (!grid) return;
    var items = SKINS.slice();
    if (state.shopFilter !== 'all') items = items.filter(function(s) { return s.rarity === state.shopFilter; });
    var rarityOrder = {common:0, rare:1, legendary:2, mythical:3};
    if (state.shopSort === 'price-asc') items.sort(function(a,b) { return a.price - b.price; });
    else if (state.shopSort === 'price-desc') items.sort(function(a,b) { return b.price - a.price; });
    else if (state.shopSort === 'rarity') items.sort(function(a,b) { return rarityOrder[a.rarity] - rarityOrder[b.rarity]; });
    else if (state.shopSort === 'name') items.sort(function(a,b) { return a.name.localeCompare(b.name); });
    if (items.length === 0) { grid.innerHTML = '<div class="empty-inv">Ничего не найдено</div>'; return; }
    var visible = items.slice(0, _shopVisibleCount);
    var frag = document.createDocumentFragment();
    visible.forEach(function(skin) {
        var shopPrice = getShopPrice(skin);
        var canAfford = state.balance >= shopPrice;
        var el = document.createElement('div');
        el.className = 'shop-item ' + skin.rarity;
        el.innerHTML = renderSkinIcon(skin) + '<div class="name">' + skin.name + '</div><div class="rarity-label" style="color:' + RARITIES[skin.rarity].color + '">' + RARITIES[skin.rarity].name + '</div><div class="price-row"><span style="font-size:0.9rem">⚙️</span><span class="price">' + formatRastr(shopPrice) + '</span></div><button class="buy-btn" ' + (canAfford ? '' : 'disabled') + '>' + (canAfford ? 'КУПИТЬ' : 'НЕ ХВАТАЕТ') + '</button>';
        el.querySelector('.buy-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            if (!canAfford) { log('❌ Недостаточно средств', 'lose'); sClick(); return; }
            openBuyModal(skin, shopPrice);
        });
        frag.appendChild(el);
    });
    if (items.length > _shopVisibleCount) {
        var more = document.createElement('button');
        more.className = 'btn-secondary';
        more.textContent = 'Показать ещё (' + (items.length - _shopVisibleCount) + ')';
        more.style.gridColumn = '1/-1'; more.style.marginTop = '16px';
        more.addEventListener('click', function() { _shopVisibleCount += 20; renderShop(); });
        frag.appendChild(more);
    }
    grid.replaceChildren(frag);
}

function openBuyModal(skin, price) {
    unlockAudio(); sClick();
    pendingPurchase = { skin: skin, price: price };
    pendingQuantity = 1;
    $('buyIcon').innerHTML = renderSkinIcon(skin);
    $('buyTitle').textContent = skin.name;
    $('buySub').textContent = RARITIES[skin.rarity].name + ' · Выбери количество:';
    $('buyPrice').textContent = formatRastr(price);
    var inner = $('buyInner'); if (!inner) return;
    var qtyRow = inner.querySelector('.buy-qty-row');
    if (!qtyRow) {
        qtyRow = document.createElement('div');
        qtyRow.className = 'buy-qty-row';
        qtyRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:14px 0;flex-wrap:wrap';
        [1,5,10,50].forEach(function(q){
            var b = document.createElement('button');
            b.className = 'btn-secondary';
            b.style.padding = '8px 16px';
            b.textContent = 'x' + q;
            b.dataset.qty = q;
            b.addEventListener('click', function() {
                pendingQuantity = q;
                qtyRow.querySelectorAll('button').forEach(function(x){ x.style.borderColor=''; x.style.color=''; });
                b.style.borderColor = 'var(--accent)'; b.style.color = 'var(--accent)';
                $('buyPrice').textContent = formatRastr(price * q);
                sClick();
            });
            qtyRow.appendChild(b);
        });
        var actions = inner.querySelector('.buy-actions');
        if (actions) inner.insertBefore(qtyRow, actions);
        else inner.appendChild(qtyRow);
    }
    qtyRow.querySelectorAll('button').forEach(function(x){ x.style.borderColor=''; x.style.color=''; });
    var firstBtn = qtyRow.querySelector('button[data-qty="1"]');
    if (firstBtn) { firstBtn.style.borderColor = 'var(--accent)'; firstBtn.style.color = 'var(--accent)'; }
    $('buyModal').classList.add('show');
}

/* ============ INVENTORY PAGE ============ */
var invFilter = 'all';
function renderInventory() {
    var inv = $('inventory'); if (!inv) return;
    if (state.inventory.length === 0) { inv.innerHTML = '<div class="empty-inv">Инвентарь пуст!<br><br>Купи скины в магазине.</div>'; return; }
    var sorted = state.inventory.slice().sort(function(a,b) { return b.price - a.price; });
    if (invFilter !== 'all') sorted = sorted.filter(function(s) { return s.rarity === invFilter; });
    if (sorted.length === 0) { inv.innerHTML = '<div class="empty-inv">Ничего не найдено</div>'; return; }
    var frag = document.createDocumentFragment();
    sorted.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'inv-item ' + skin.rarity;
        el.innerHTML = renderSkinIcon(skin) + '<div class="name">' + skin.name + '</div><div class="price">' + formatRastr(skin.price) + '</div><button class="sell-btn">Продать</button>';
        el.querySelector('.sell-btn').addEventListener('click', function(e) { e.stopPropagation(); sellSkin(skin); });
        frag.appendChild(el);
    });
    inv.replaceChildren(frag);
}

function sellSkin(skin) {
    var idx = state.inventory.indexOf(skin); if (idx < 0) return;
    state.inventory.splice(idx, 1);
    state.balance += skin.price;
    if (state.upgradeSource === skin) resetUpgradeSlots();
    updateUI(); renderInventory(); renderInvPanel(); sClick();
    log('💰 Продано: ' + skin.name + ' +' + formatRastr(skin.price), 'info');
    save();
}

/* ============ RENDER ALL ============ */
function renderAll() {
    renderSourceSlot(); renderTargetSlot(); renderPresets();
    renderInvPanel(); renderItemsPanel(); renderShop();
    updateUI(); renderInventory();
    updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
    setNeedleAngle(0);
    updateSpeedButtons();
}

function updateSpeedButtons() {
    var slowBtn = $('speedSlowBtn');
    var fastBtn = $('speedFastBtn');
    if (!slowBtn || !fastBtn) return;
    if (state.spinSpeed === 'fast') { slowBtn.classList.remove('active'); fastBtn.classList.add('active'); }
    else { slowBtn.classList.add('active'); fastBtn.classList.remove('active'); }
}

/* ============ HANDLERS ============ */
function attachHandlers() {
    var userBadge = $('userBadge');
    if (userBadge) userBadge.addEventListener('click', function() {
        if (currentUser) openLogoutModal();  // ФИКС #3: своё окно
        else openAuthModal();
    });

    // ФИКС #3: кнопки своего окна выхода
    var logoutConfirm = $('logoutConfirm');
    if (logoutConfirm) logoutConfirm.addEventListener('click', confirmLogout);
    var logoutCancel = $('logoutCancel');
    if (logoutCancel) logoutCancel.addEventListener('click', function(){ sClick(); closeLogoutModal(); });

    // Бонус-модалка
    var bonusCancel = $('bonusCancel');
    if (bonusCancel) bonusCancel.addEventListener('click', function(){ sClick(); closeBonusPicker(); });
    var bonusRandom = $('bonusRandom');
    if (bonusRandom) bonusRandom.addEventListener('click', function(){
        var b = pickRandomBonus();
        if (b) { state.bonusSkin = b; closeBonusPicker(); log('🎁 Бонус: ' + b.name, 'info'); renderTargetSlot(); }
    });

    var speedSlow = $('speedSlowBtn');
    if (speedSlow) speedSlow.addEventListener('click', function() { unlockAudio(); sClick(); state.spinSpeed = 'slow'; updateSpeedButtons(); save(); });

    var speedFast = $('speedFastBtn');
    if (speedFast) speedFast.addEventListener('click', function() { unlockAudio(); sClick(); state.spinSpeed = 'fast'; updateSpeedButtons(); save(); });

    var resultContinue = $('resultContinue');
    if (resultContinue) resultContinue.addEventListener('click', closeResult);

    var soundBtn = $('soundBtn');
    if (soundBtn) soundBtn.addEventListener('click', function() {
        state.soundOn = !state.soundOn;
        $('soundIcon').textContent = state.soundOn ? '🔊' : '🔇';
        if (state.soundOn) { unlockAudio(); sClick(); }
        save();
    });

    var resetAllBtn = $('resetAllBtn');
    if (resetAllBtn) resetAllBtn.addEventListener('click', function() {
        if (!confirm('Сбросить весь прогресс?')) return;
        resetStateToDefault(); state.balance = START_BALANCE;
        save(); renderAll(); log('🗑️ Прогресс сброшен', 'info');
    });

    var buyCancel = $('buyCancel');
    if (buyCancel) buyCancel.addEventListener('click', function() { sClick(); $('buyModal').classList.remove('show'); pendingPurchase = null; pendingQuantity = 1; });

    /* ФИКС #9: корректная обработка массовой покупки при нехватке */
    var buyConfirm = $('buyConfirm');
    if (buyConfirm) buyConfirm.addEventListener('click', function() {
        if (!pendingPurchase) return;
        var skin = pendingPurchase.skin; var unitPrice = pendingPurchase.price;
        var qty = pendingQuantity || 1;
        var totalPrice = unitPrice * qty;
        if (state.balance < totalPrice) {
            // Пробуем уменьшить qty
            var maxQty = Math.floor(state.balance / unitPrice);
            if (maxQty <= 0) { log('❌ Недостаточно средств', 'lose'); sClick(); return; }
            qty = maxQty;
            totalPrice = unitPrice * qty;
            log('⚠️ Хватило только на x' + qty, 'info');
        }
        state.balance -= totalPrice;
        for (var i = 0; i < qty; i++) state.inventory.push(skin);
        state.purchases += qty;
        state.totalLost += totalPrice; state.profit -= totalPrice; state.housePlayerLost += totalPrice;
        addXP(10 * qty); sBuy();
        log('🛒 Куплено: ' + skin.name + ' x' + qty + ' за ' + formatRastr(totalPrice), 'win');
        $('buyModal').classList.remove('show'); pendingPurchase = null; pendingQuantity = 1;
        updateUI(); renderShop(); renderInventory(); renderInvPanel(); save();
    });

    var sellAllBtn = $('sellAllBtn');
    if (sellAllBtn) sellAllBtn.addEventListener('click', function() {
        if (state.inventory.length === 0) return;
        var total = state.inventory.reduce(function(s, i) { return s + i.price; }, 0);
        state.balance += total; state.inventory = [];
        resetUpgradeSlots(); updateUI(); renderInventory(); renderInvPanel(); sBuy();
        log('💰 Продано: +' + formatRastr(total), 'win'); save();
    });

    var upgradeBtn = $('upgradeBtn');
    if (upgradeBtn) upgradeBtn.addEventListener('click', handleUpgrade);

    var sourceSlot = $('sourceSlot');
    if (sourceSlot) sourceSlot.addEventListener('click', function() {
        if (state.upgradeSource) return;
        unlockAudio(); sClick();
        var panel = document.querySelector('.upg-inv-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    var targetSlot = $('targetSlot');
    if (targetSlot) targetSlot.addEventListener('click', function() {
        if (state.upgradeTarget) return;
        unlockAudio(); sClick();
        var panel = document.querySelector('.upg-items-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    var sourceRemoveBtn = $('sourceRemoveBtn');
    if (sourceRemoveBtn) sourceRemoveBtn.addEventListener('click', function(e) { e.stopPropagation(); unlockAudio(); sClick(); resetUpgradeSlots(); });

    var targetRemoveBtn = $('targetRemoveBtn');
    if (targetRemoveBtn) targetRemoveBtn.addEventListener('click', function(e) {
        e.stopPropagation(); unlockAudio(); sClick();
        state.upgradeTarget = null; state.selectedPreset = null; state.bonusSkin = null;
        renderTargetSlot(); renderPresets(); updateCircleFromPreset();
    });

    var invSearch = $('invSearch');
    if (invSearch) invSearch.addEventListener('input', renderInvPanel);
    var itemsSearch = $('itemsSearch');
    if (itemsSearch) itemsSearch.addEventListener('input', renderItemsPanel);

    var shopSort = $('shopSort');
    if (shopSort) shopSort.addEventListener('change', function(e) { state.shopSort = e.target.value; _shopVisibleCount = 20; renderShop(); save(); sClick(); });

    document.querySelectorAll('.shop-filter').forEach(function(btn) {
        btn.addEventListener('click', function() {
            unlockAudio(); sClick();
            document.querySelectorAll('.shop-filter').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active'); state.shopFilter = btn.dataset.rarity;
            _shopVisibleCount = 20; renderShop(); save();
        });
    });

    document.querySelectorAll('.inv-filter').forEach(function(btn) {
        btn.addEventListener('click', function() {
            unlockAudio(); sClick();
            document.querySelectorAll('.inv-filter').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active'); invFilter = btn.dataset.rarity; renderInventory();
        });
    });

    document.querySelectorAll('.nav-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            unlockAudio(); sClick(); stopAllLoopSounds();
            document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
            tab.classList.add('active');
            $('page-' + tab.dataset.page).classList.add('active');
            if (tab.dataset.page === 'shop') { _shopVisibleCount = 20; renderShop(); }
            if (tab.dataset.page === 'inventory') renderInventory();
            if (tab.dataset.page === 'upgrade') { renderInvPanel(); renderItemsPanel(); }
        });
    });

    document.addEventListener('visibilitychange', function() { if (document.hidden) stopAllLoopSounds(); });
    document.body.addEventListener('click', function() { unlockAudio(); }, { once: true });
}

/* ============ INIT ============ */
function init() {
    initPanelFilters('invPanelFilters', 'invPanelFilter', renderInvPanel);
    initPanelFilters('itemsPanelFilters', 'itemsPanelFilter', renderItemsPanel);

    var shopFilterBtn = document.querySelector('.shop-filter[data-rarity="' + state.shopFilter + '"]');
    if (shopFilterBtn) {
        document.querySelectorAll('.shop-filter').forEach(function(b) { b.classList.remove('active'); });
        shopFilterBtn.classList.add('active');
    }
    if ($('shopSort')) $('shopSort').value = state.shopSort;
    if ($('soundIcon')) $('soundIcon').textContent = state.soundOn ? '🔊' : '🔇';

    attachHandlers();
    setupFirebase();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
