/* ============================================================
   RASTRGRADE v25 — UPGRADE ONLY
   Убраны пресеты 35/50/75, оставлены только множители x1.5...x500
   Шанс ВСЕГДА = (source / target) × 100 — честный
   ============================================================ */

/* ============ КУРС ВАЛЮТ ============ */
const USD_TO_UAH = 44.60;
const NUM_FMT = new Intl.NumberFormat('ru');
function usdToUah(usd) { return Math.round(usd * USD_TO_UAH); }
function formatUah(v) { return NUM_FMT.format(Math.round(v)) + ' ₴'; }
function getShopPrice(skin) { return Math.ceil(skin.price * 1.15); }

/* ============ SVG ФОЛБЭКИ ============ */
const ICON_SVG = {
    knife:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M8 54l6-6 32-32 6 6-32 32-6 6z"/><path d="M44 18l8-8 6 6-8 8z"/></svg>',
    axe:'<svg viewBox="0 0 64 64" fill="currentColor"><rect x="28" y="6" width="6" height="52" rx="2"/><path d="M34 8l22 10-22 10z"/></svg>',
    rifle:'<svg viewBox="0 0 64 64" fill="currentColor"><rect x="4" y="26" width="52" height="6" rx="2"/><rect x="16" y="32" width="8" height="16" rx="1"/><rect x="46" y="20" width="6" height="12" rx="1"/></svg>',
    pistol:'<svg viewBox="0 0 64 64" fill="currentColor"><rect x="12" y="24" width="40" height="10" rx="2"/><path d="M24 34l6 16h10l-4-16z"/></svg>',
    armor:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 6l20 10v14c0 14-10 22-20 28-10-6-20-14-20-28V16z"/></svg>',
    helmet:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M12 34a20 20 0 0140 0v14H12z"/></svg>',
    medkit:'<svg viewBox="0 0 64 64" fill="currentColor"><rect x="8" y="16" width="48" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="4"/><path d="M28 24v20M18 34h20" stroke="currentColor" stroke-width="4"/></svg>',
    bomb:'<svg viewBox="0 0 64 64" fill="currentColor"><circle cx="32" cy="38" r="18"/><path d="M46 22l6-6M44 14l4 4"/></svg>',
    gem:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 6l24 18-24 34L8 24z"/></svg>',
    crown:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M8 48h48l4-28-14 12L32 12 18 32 4 20z"/></svg>',
    trophy:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M20 8h24v14c0 8-6 12-12 12s-12-4-12-12z"/><rect x="28" y="34" width="8" height="14"/><rect x="20" y="48" width="24" height="8" rx="2"/></svg>',
    crossbow:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M8 32h48M32 12v40" stroke="currentColor" stroke-width="4"/></svg>',
    mask:'<svg viewBox="0 0 64 64" fill="currentColor"><ellipse cx="32" cy="34" rx="20" ry="16"/><circle cx="24" cy="34" r="4" fill="black"/><circle cx="40" cy="34" r="4" fill="black"/></svg>',
    rocket:'<svg viewBox="0 0 64 64" fill="currentColor"><path d="M32 4c8 8 12 20 12 32l-12 8-12-8c0-12 4-24 12-32z"/></svg>',
    turret:'<svg viewBox="0 0 64 64" fill="currentColor"><rect x="8" y="28" width="40" height="8" rx="2"/><rect x="20" y="36" width="6" height="16"/></svg>',
    default:'<svg viewBox="0 0 64 64" fill="currentColor"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="3"/><text x="32" y="42" text-anchor="middle" font-size="28" font-weight="bold" fill="currentColor">?</text></svg>'
};

/* ============ SKINS ============ */
const SKINS = [
    {id:'rock', name:'Камень', svg:'default', rarity:'common', price:usdToUah(0.10)},
    {id:'torch', name:'Факел', svg:'default', rarity:'common', price:usdToUah(0.15)},
    {id:'bandage', name:'Бинты', svg:'medkit', rarity:'common', price:usdToUah(0.20)},
    {id:'burlap', name:'Мешковина', svg:'armor', rarity:'common', price:usdToUah(0.25)},
    {id:'box', name:'Деревянный ящик', svg:'default', rarity:'common', price:usdToUah(0.18)},
    {id:'hatchet', name:'Каменный топор', svg:'axe', rarity:'common', price:usdToUah(0.30)},
    {id:'spear', name:'Деревянное копьё', svg:'rifle', rarity:'common', price:usdToUah(0.35)},
    {id:'bow', name:'Лук', svg:'crossbow', rarity:'common', price:usdToUah(0.40)},
    {id:'revolver', name:'Револьвер', svg:'pistol', rarity:'common', price:usdToUah(0.50)},
    {id:'knife_bone', name:'Костяной нож', svg:'knife', rarity:'common', price:usdToUah(0.20)},
    {id:'knife_stone', name:'Каменный нож', svg:'knife', rarity:'common', price:usdToUah(0.25)},
    {id:'shotgun_pipe', name:'Водопроводный дробовик', svg:'rifle', rarity:'common', price:usdToUah(0.50)},
    {id:'spear_metal', name:'Металлическое копьё', svg:'rifle', rarity:'uncommon', price:usdToUah(2)},
    {id:'shotgun_double', name:'Двойной ствол', svg:'rifle', rarity:'uncommon', price:usdToUah(3)},
    {id:'rifle_semiauto', name:'Полуавтомат', svg:'rifle', rarity:'uncommon', price:usdToUah(4)},
    {id:'smg_custom', name:'Самодельный ПП', svg:'rifle', rarity:'uncommon', price:usdToUah(5)},
    {id:'hide', name:'Кожаная броня', svg:'armor', rarity:'uncommon', price:usdToUah(3)},
    {id:'respirator', name:'Респиратор', svg:'mask', rarity:'uncommon', price:usdToUah(4)},
    {id:'cupboard', name:'Шкаф', svg:'default', rarity:'uncommon', price:usdToUah(2)},
    {id:'trap_bear', name:'Капкан', svg:'default', rarity:'uncommon', price:usdToUah(5)},
    {id:'thompson', name:'Томпсон', svg:'rifle', rarity:'uncommon', price:usdToUah(8)},
    {id:'sks', name:'SKS', svg:'rifle', rarity:'rare', price:usdToUah(10)},
    {id:'m39', name:'M39', svg:'rifle', rarity:'rare', price:usdToUah(12)},
    {id:'pump', name:'Дробовик', svg:'rifle', rarity:'rare', price:usdToUah(15)},
    {id:'python', name:'Python', svg:'pistol', rarity:'rare', price:usdToUah(20)},
    {id:'roadsign', name:'Дорожные знаки', svg:'armor', rarity:'rare', price:usdToUah(10)},
    {id:'coffee', name:'Coffee Can Helmet', svg:'helmet', rarity:'rare', price:usdToUah(8)},
    {id:'gas_mask', name:'Противогаз', svg:'mask', rarity:'rare', price:usdToUah(12)},
    {id:'locker', name:'Сейф', svg:'default', rarity:'rare', price:usdToUah(15)},
    {id:'radio', name:'Радиостанция', svg:'default', rarity:'rare', price:usdToUah(10)},
    {id:'ak', name:'AK-47', svg:'rifle', rarity:'epic', price:usdToUah(15)},
    {id:'lr300', name:'LR-300', svg:'rifle', rarity:'epic', price:usdToUah(25)},
    {id:'mp5', name:'MP5A4', svg:'rifle', rarity:'epic', price:usdToUah(20)},
    {id:'bolt', name:'Болтовка', svg:'rifle', rarity:'epic', price:usdToUah(30)},
    {id:'m92', name:'M92 Beretta', svg:'pistol', rarity:'epic', price:usdToUah(25)},
    {id:'metal_mask', name:'Металлическая маска', svg:'mask', rarity:'epic', price:usdToUah(35)},
    {id:'explosive', name:'Взрывчатка', svg:'bomb', rarity:'epic', price:usdToUah(40)},
    {id:'turret', name:'Турель', svg:'turret', rarity:'epic', price:usdToUah(45)},
    {id:'gps', name:'GPS', svg:'default', rarity:'epic', price:usdToUah(35)},
    {id:'l96', name:'L96', svg:'rifle', rarity:'legendary', price:usdToUah(80)},
    {id:'m249', name:'M249', svg:'rifle', rarity:'legendary', price:usdToUah(120)},
    {id:'spas', name:'SPAS-12', svg:'rifle', rarity:'legendary', price:usdToUah(90)},
    {id:'c4', name:'C4', svg:'bomb', rarity:'legendary', price:usdToUah(100)},
    {id:'rocket', name:'Ракетница', svg:'rocket', rarity:'legendary', price:usdToUah(150)},
    {id:'ak_glory', name:'Glory AK47', svg:'rifle', rarity:'mythical', price:usdToUah(310)},
    {id:'smg_alien', name:'Alien Relic SMG', svg:'rifle', rarity:'mythical', price:usdToUah(1816)},
    {id:'mask_biggrin', name:'Big Grin Facemask', svg:'mask', rarity:'mythical', price:usdToUah(1323)},
    {id:'bandana_clown', name:'Creepy Clown Bandana', svg:'mask', rarity:'mythical', price:usdToUah(1157)}
];

const SVG_CACHE = {};
Object.keys(ICON_SVG).forEach(function(k){ SVG_CACHE[k] = ICON_SVG[k]; });

function renderSkinIcon(skin) {
    var svgKey = skin.svg || 'default';
    return '<div class="skin-icon">' + (SVG_CACHE[svgKey] || SVG_CACHE.default) + '</div>';
}

const RARITIES = {
    common:    { name:'Обычный',     color:'#7a7a8a' },
    uncommon:  { name:'Необычный',   color:'#4aa8ff' },
    rare:      { name:'Редкий',      color:'#a55cff' },
    epic:      { name:'Эпический',   color:'#ff3d9a' },
    legendary: { name:'Легендарный', color:'#f5c542' },
    mythical:  { name:'МИФИЧЕСКИЙ',  color:'#ff0044' }
};

/* ============================================================
   ПРЕСЕТЫ — ТОЛЬКО МНОЖИТЕЛИ
   ============================================================ */
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

/* ============ SKIN CACHE ============ */
var SKIN_BY_ID = {};
SKINS.forEach(function(s){ SKIN_BY_ID[s.id] = s; });
function resolveSkin(item) {
    if (!item) return null;
    return SKIN_BY_ID[item.id] || item;
}

/* ============ STATE ============ */
var state = {
    balance: 0,
    inventory: [],
    profit: 0,
    totalWon: 0, totalLost: 0, upgrades: 0, purchases: 0,
    bestDrop: null, bestUpgrade: null,
    upgradeSource: null,
    upgradeTarget: null,
    selectedPreset: null,
    housePlayerLost: 0, houseCasinoWon: 0,
    xp: 0, level: 1,
    soundOn: true,
    shopFilter: 'all', shopSort: 'price-asc',
    invPanelFilter: 'all', itemsPanelFilter: 'all'
};

function save() {
    try {
        var save_data = {
            balance: state.balance,
            inventory: state.inventory.map(function(i){ return {id:i.id, rarity:i.rarity}; }),
            profit: state.profit,
            totalWon: state.totalWon, totalLost: state.totalLost,
            upgrades: state.upgrades,
            purchases: state.purchases,
            bestDrop: state.bestDrop ? {id:state.bestDrop.id, rarity:state.bestDrop.rarity} : null,
            bestUpgrade: state.bestUpgrade ? {id:state.bestUpgrade.id, rarity:state.bestUpgrade.rarity} : null,
            housePlayerLost: state.housePlayerLost, houseCasinoWon: state.houseCasinoWon,
            xp: state.xp, level: state.level,
            soundOn: state.soundOn,
            shopFilter: state.shopFilter, shopSort: state.shopSort
        };
        localStorage.setItem('rastrgrade_v25', JSON.stringify(save_data));
    } catch(e) {}
}

function load() {
    try {
        var raw = localStorage.getItem('rastrgrade_v25');
        if (!raw) {
            state.balance = 5;
            save();
            return;
        }
        var s = JSON.parse(raw);
        Object.keys(s).forEach(function(k){ state[k] = s[k]; });
        state.inventory = (state.inventory||[]).map(resolveSkin).filter(Boolean);
        if (state.bestDrop) state.bestDrop = resolveSkin(state.bestDrop);
        if (state.bestUpgrade) state.bestUpgrade = resolveSkin(state.bestUpgrade);
    } catch(e) {
        state.balance = 5;
        save();
    }
}

function $(id){ return document.getElementById(id); }

/* ============================================================
   ЗВУКИ
   ============================================================ */
const SOUND_FILES = {
    spin: 'sounds/spin.mp3',
    win_common: 'sounds/win_common.mp3',
    win_legendary: 'sounds/win_legendary.mp3',
    lose: 'sounds/lose.mp3',
    click: 'sounds/click.mp3',
    buy: 'sounds/buy.mp3',
    levelup: 'sounds/levelup.mp3'
};

var SOUNDS = {};
var audioReady = false;

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
        s.play().then(function(){
            s.pause(); s.currentTime = 0; s.volume = 0.7;
        }).catch(function(){});
    });
}

var _soundQueue = [];
var _soundPlaying = false;

function _playNextQueued() {
    if (_soundPlaying || _soundQueue.length === 0) return;
    var next = _soundQueue.shift();
    if (!next) return;
    _soundPlaying = true;
    next.audio.volume = next.vol;
    next.audio.play().then(function(){
        next.audio.onended = function(){
            _soundPlaying = false;
            _playNextQueued();
        };
        setTimeout(function(){
            _soundPlaying = false;
            _playNextQueued();
        }, next.duration);
    }).catch(function(){
        _soundPlaying = false;
        _playNextQueued();
    });
}

function playSound(name, vol) {
    if (!state.soundOn) return;
    var src = SOUNDS[name];
    if (!src) return;
    try {
        var c = src.cloneNode();
        var duration = (src.duration || 1) * 1000;
        _soundQueue.push({ audio: c, vol: vol || 0.7, duration: duration });
        _playNextQueued();
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

var _loopAudio = {};

function startLoopSound(name, vol) {
    if (!state.soundOn) return null;
    var src = SOUNDS[name];
    if (!src) return null;
    if (_loopAudio[name]) { try { _loopAudio[name].pause(); } catch(e){} }
    var c = src.cloneNode();
    c.volume = vol || 0.6;
    c.loop = true;
    c.play().catch(function(){});
    _loopAudio[name] = c;
    return {
        stop: function() {
            if (_loopAudio[name]) {
                try { _loopAudio[name].pause(); } catch(e){}
                _loopAudio[name] = null;
            }
        },
        fadeStop: function(duration) {
            duration = duration || 800;
            var audio = _loopAudio[name];
            if (!audio) return;
            var startVol = audio.volume;
            var startTime = performance.now();
            var iv = setInterval(function(){
                var t = (performance.now() - startTime) / duration;
                if (t >= 1) {
                    clearInterval(iv);
                    try { audio.pause(); } catch(e){}
                    _loopAudio[name] = null;
                    return;
                }
                audio.volume = Math.max(0, startVol * (1 - t));
            }, 50);
        }
    };
}

function stopAllLoopSounds() {
    Object.keys(_loopAudio).forEach(function(k){
        if (_loopAudio[k]) {
            try { _loopAudio[k].pause(); } catch(e){}
            _loopAudio[k] = null;
        }
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
    var wrap = $('toastWrap');
    while (wrap.children.length >= 5) {
        wrap.removeChild(wrap.firstChild);
    }
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

/* ============================================================
   УТИЛИТЫ
   ============================================================ */

/* Ищет скин, ближайший по цене к targetPrice. Исключает sourceSkin */
function findTargetByPrice(targetPrice, sourceSkin) {
    var best = null, bestDiff = Infinity;
    SKINS.forEach(function(s){
        if (sourceSkin && s.id === sourceSkin.id) return;
        var d = Math.abs(s.price - targetPrice);
        if (d < bestDiff) { bestDiff = d; best = s; }
    });
    return best;
}

/* Реальный шанс всегда = (source / target) × 100 */
function calcRealChance(sourcePrice, targetPrice) {
    var chance = (sourcePrice / targetPrice) * 100;
    if (chance > 95) chance = 95;
    if (chance < 0.01) chance = 0.01;
    return chance;
}

function addXP(n) {
    state.xp += n;
    var prev = state.level;
    for (var i = LEVELS.length - 1; i >= 0; i--) { if (state.xp >= LEVELS[i].xp) { state.level = LEVELS[i].lvl; break; } }
    if (state.level > prev) {
        var reward = state.level * usdToUah(11);
        state.balance += reward;
        log('⬆️ Уровень ' + state.level + '! +' + formatUah(reward), 'win');
        sLevelUp();
    }
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
     'itemsPanelGrid','invSearch','itemsSearch','upgradeBtn']
    .forEach(function(id){ DOM[id] = $(id); });
    DOM.shopBalance = $('shopBalance');
}
cacheDom();

function updateUI() {
    DOM.balance.textContent = formatUah(state.balance);
    DOM.shopBalance.textContent = formatUah(state.balance);
    var p = DOM.profit;
    p.textContent = (state.profit >= 0 ? '+' : '') + formatUah(state.profit);
    p.className = 'hud-stat-value ' + (state.profit >= 0 ? 'green' : 'red');
    DOM.invCount.textContent = state.inventory.length;
    DOM.invValue.textContent = formatUah(state.inventory.reduce(function(s,i){return s+i.price},0));
    DOM.statTotalWon.textContent = formatUah(state.totalWon);
    DOM.statTotalLost.textContent = formatUah(state.totalLost);
    DOM.statUpgrades.textContent = state.upgrades;
    DOM.statPurchases.textContent = state.purchases;
    DOM.statBestDrop.textContent = state.bestDrop ? state.bestDrop.name + ' ' + formatUah(state.bestDrop.price) : '—';
    DOM.statBestUpgrade.textContent = state.bestUpgrade ? state.bestUpgrade.name + ' ' + formatUah(state.bestUpgrade.price) : '—';
    DOM.housePlayer.textContent = formatUah(state.housePlayerLost);
    DOM.houseCasino.textContent = formatUah(state.houseCasinoWon);
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

/* ============================================================
   SHOW RESULT
   ============================================================ */
function showResult(o) {
    var inner = $('resultInner');
    inner.className = 'modal-inner result-inner ' + o.type;
    if (o.skin) {
        $('resultIcon').innerHTML = '';
        $('resultIcon').style.display = 'none';
        $('resultSkin').innerHTML =
            '<div class="item ' + o.skin.rarity + '" style="margin:0 auto;display:inline-flex;border:none;background:transparent;min-width:auto;height:auto;padding:0">' +
                renderSkinIcon(o.skin) +
                '<div style="margin-top:12px">' +
                    '<div class="name" style="font-size:0.85rem">' + o.skin.name + '</div>' +
                    '<div class="price" style="font-size:1rem;margin-top:6px">' + formatUah(o.skin.price) + '</div>' +
                '</div>' +
            '</div>';
    } else {
        $('resultIcon').textContent = o.icon;
        $('resultIcon').style.display = 'block';
        $('resultSkin').innerHTML = '';
    }
    $('resultTitle').textContent = o.title;
    $('resultValue').textContent = o.value;
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

function closeResult() {
    sClick();
    $('resultModal').classList.remove('show');
}

/* ============================================================
   UPGRADE — CIRCLE
   ============================================================ */
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

function setNeedleAngle(deg) {
    $('circleNeedle').style.transform = 'rotate(' + deg + 'deg)';
}

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

/* Рендер слота "источник" */
function renderSourceSlot() {
    var slot = $('sourceSlot');
    if (state.upgradeSource) {
        slot.className = 'upg-item-slot filled ' + state.upgradeSource.rarity;
        slot.innerHTML =
            renderSkinIcon(state.upgradeSource) +
            '<div class="upg-item-name">' + state.upgradeSource.name + '</div>' +
            '<div class="upg-item-rarity" style="color:' + RARITIES[state.upgradeSource.rarity].color + '">' + RARITIES[state.upgradeSource.rarity].name + '</div>';
        $('sourcePriceLabel').textContent = formatUah(state.upgradeSource.price);
        $('sourceRemoveBtn').style.display = 'block';
    } else {
        slot.className = 'upg-item-slot';
        slot.innerHTML =
            '<div class="upg-item-empty">' +
                '<div class="upg-item-empty-icon">+</div>' +
                '<div class="upg-item-empty-text">Выбрать предмет</div>' +
            '</div>';
        $('sourcePriceLabel').textContent = '—';
        $('sourceRemoveBtn').style.display = 'none';
    }
}

/* Рендер слота "цель" */
function renderTargetSlot() {
    var slot = $('targetSlot');
    if (state.upgradeTarget) {
        slot.className = 'upg-item-slot filled ' + state.upgradeTarget.rarity;
        slot.innerHTML =
            renderSkinIcon(state.upgradeTarget) +
            '<div class="upg-item-name">' + state.upgradeTarget.name + '</div>' +
            '<div class="upg-item-rarity" style="color:' + RARITIES[state.upgradeTarget.rarity].color + '">' + RARITIES[state.upgradeTarget.rarity].name + '</div>';
        $('targetPriceLabel').textContent = formatUah(state.upgradeTarget.price);
        $('targetRemoveBtn').style.display = 'block';
    } else {
        slot.className = 'upg-item-slot';
        slot.innerHTML =
            '<div class="upg-item-empty">' +
                '<div class="upg-item-empty-icon">?</div>' +
                '<div class="upg-item-empty-text">Цель</div>' +
            '</div>';
        $('targetPriceLabel').textContent = '—';
        $('targetRemoveBtn').style.display = 'none';
    }
}

/* Обновление круга — реальный шанс */
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

/* Рендер пресетов — с реальным шансом */
function renderPresets() {
    var container = $('presetContainer');
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
            } else {
                displayText = '—';
            }
        }

        btn.innerHTML =
            '<span class="upg-preset-mult">' + p.label + '</span>' +
            '<span class="upg-preset-chance">' + displayText + '</span>';

        if (state.selectedPreset === idx) btn.classList.add('active');
        btn.addEventListener('click', function() { selectPreset(idx); });
        frag.appendChild(btn);
    });
    container.replaceChildren(frag);
}

/* Выбор пресета — только множители */
function selectPreset(idx) {
    if (!state.upgradeSource) { log('❌ Сначала выбери предмет', 'lose'); return; }
    unlockAudio(); sClick();

    var p = PRESETS[idx];
    var sourcePrice = state.upgradeSource.price;
    var desiredTargetPrice = sourcePrice * p.mult;

    var target = findTargetByPrice(desiredTargetPrice, state.upgradeSource);

    if (!target || target.price <= sourcePrice) {
        log('❌ Нет подходящей цели для ' + p.label, 'lose');
        return;
    }

    state.upgradeTarget = target;
    state.selectedPreset = idx;
    state.upgradeTarget._realChance = calcRealChance(sourcePrice, target.price);

    renderTargetSlot();
    renderPresets();
    updateCircleFromPreset();
}

/* ============================================================
   INVENTORY PANEL
   ============================================================ */
function renderInvPanel() {
    var list = $('invPanelList');
    var filter = state.invPanelFilter;
    var search = ($('invSearch').value || '').toLowerCase();
    var sorted = state.inventory.slice().sort(function(a,b) { return b.price - a.price; });
    if (filter !== 'all') sorted = sorted.filter(function(s) { return s.rarity === filter; });
    if (search) sorted = sorted.filter(function(s) { return s.name.toLowerCase().indexOf(search) >= 0; });

    $('invPanelCount').textContent = state.inventory.length + ' шт.';

    if (sorted.length === 0) {
        list.innerHTML = '<div class="upg-inv-empty">Инвентарь пуст</div>';
        return;
    }

    var frag = document.createDocumentFragment();
    sorted.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'upg-inv-item ' + skin.rarity;
        if (state.upgradeSource && state.upgradeSource === skin) el.classList.add('used');
        el.innerHTML = renderSkinIcon(skin) +
            '<div class="upg-inv-name">' + skin.name + '</div>' +
            '<div class="upg-inv-price">' + formatUah(skin.price) + '</div>';
        el.addEventListener('click', function() {
            unlockAudio(); sClick();
            state.upgradeSource = skin;
            state.upgradeTarget = null;
            state.selectedPreset = null;
            renderSourceSlot();
            renderTargetSlot();
            renderInvPanel();
            renderPresets();
            updateCircleFromPreset();
        });
        frag.appendChild(el);
    });
    list.replaceChildren(frag);
}

/* ============================================================
   ITEMS PANEL
   ============================================================ */
function renderItemsPanel() {
    var grid = $('itemsPanelGrid');
    var filter = state.itemsPanelFilter;
    var search = ($('itemsSearch').value || '').toLowerCase();
    var items = SKINS.slice();
    if (filter !== 'all') items = items.filter(function(s) { return s.rarity === filter; });
    if (search) items = items.filter(function(s) { return s.name.toLowerCase().indexOf(search) >= 0; });

    $('targetsCount').textContent = items.length;

    if (items.length === 0) {
        grid.innerHTML = '<div class="upg-inv-empty" style="grid-column:1/-1">Ничего не найдено</div>';
        return;
    }

    var frag = document.createDocumentFragment();
    items.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'upg-target-item ' + skin.rarity;
        el.innerHTML = renderSkinIcon(skin) +
            '<div class="upg-target-name">' + skin.name + '</div>' +
            '<div class="upg-target-price">' + formatUah(skin.price) + '</div>';
        el.addEventListener('click', function() {
            if (!state.upgradeSource) {
                log('❌ Сначала выбери свой предмет', 'lose');
                return;
            }
            unlockAudio(); sClick();
            state.upgradeTarget = skin;
            state.selectedPreset = null;
            state.upgradeTarget._realChance = calcRealChance(state.upgradeSource.price, skin.price);

            renderTargetSlot();
            renderPresets();
            updateCircleFromPreset();
        });
        frag.appendChild(el);
    });
    grid.replaceChildren(frag);
}

/* ============================================================
   АНИМАЦИЯ
   ============================================================ */
function playUpgradeAnimation(chance, willWin) {
    return new Promise(function(resolve) {
        var duration = 4000;
        var sectorEnd = chance * 3.6;
        var finalAngle;
        if (willWin) {
            var margin = Math.min(sectorEnd * 0.15, 8);
            finalAngle = Math.max(margin, Math.random() * (sectorEnd - margin));
        } else {
            var roll = Math.random();
            if (roll < 0.7) {
                finalAngle = sectorEnd + 0.5 + Math.random() * 1.5;
            } else {
                var farStart = sectorEnd + 20;
                var farEnd = 355;
                finalAngle = farStart + Math.random() * (farEnd - farStart);
            }
        }
        var fullSpins = 8 + Math.floor(Math.random() * 4);
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
                if (willWin) {
                    s.textContent = '✅ ПОБЕДА';
                    s.className = 'upg-status win';
                } else {
                    s.textContent = '❌ ПРОВАЛ';
                    s.className = 'upg-status lose';
                }
                setTimeout(resolve, 900);
            }
        }
        requestAnimationFrame(animate);
    });
}

/* ============================================================
   КНОПКА АПГРЕЙД
   ============================================================ */
$('upgradeBtn').addEventListener('click', async function() {
    if (!state.upgradeSource || !state.upgradeTarget) return;
    if (state.upgrading) return;
    unlockAudio();

    var btn = $('upgradeBtn');
    btn.style.pointerEvents = 'none';

    var chance = state.upgradeTarget._realChance;
    if (chance === undefined) {
        chance = calcRealChance(state.upgradeSource.price, state.upgradeTarget.price);
    }

    var roll = Math.random() * 100;
    var success = roll < chance;

    state.upgrading = true;
    state.upgrades++;
    btn.disabled = true;

    var sourceSkin = state.upgradeSource;
    var targetSkin = state.upgradeTarget;
    var sourceValue = sourceSkin.price;
    var targetValue = targetSkin.price;

    addXP(20);

    await playUpgradeAnimation(chance, success);

    var srcIdx = state.inventory.indexOf(sourceSkin);
    if (srcIdx >= 0) state.inventory.splice(srcIdx, 1);

    if (success) {
        state.inventory.push(targetSkin);
        state.totalWon += targetValue;
        state.profit += targetValue - sourceValue;
        state.houseCasinoWon += targetValue;
        if (!state.bestUpgrade || targetValue > state.bestUpgrade.price) state.bestUpgrade = targetSkin;
        sWin(targetSkin.rarity);
        showResult({
            type: 'result-win', icon: '🏆', title: '✅ УСПЕХ', skin: targetSkin,
            value: '+' + formatUah(targetValue), canSell: true,
            sellCallback: function() {
                var i = state.inventory.indexOf(targetSkin);
                if (i >= 0) { state.inventory.splice(i, 1); state.balance += targetSkin.price; updateUI(); renderInventory(); renderInvPanel(); }
            }
        });
        log('⚡ ' + sourceSkin.name + ' → ' + targetSkin.name + ' ✅', 'win');
    } else {
        state.totalLost += sourceValue;
        state.profit -= sourceValue;
        state.housePlayerLost += sourceValue;
        sLose();
        showResult({
            type: 'result-lose', icon: '💀', title: '❌ ПРОВАЛ',
            skin: null,
            value: 'Потеряно: ' + formatUah(sourceValue),
            canSell: false
        });
        log('⚡ ' + sourceSkin.name + ' → провал ❌', 'lose');
    }

    state.upgradeSource = null;
    state.upgradeTarget = null;
    state.selectedPreset = null;
    state.upgrading = false;
    btn.style.pointerEvents = '';
    btn.disabled = true;

    renderSourceSlot();
    renderTargetSlot();
    renderInvPanel();
    renderItemsPanel();
    renderPresets();
    updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
    setNeedleAngle(0);
    updateUI();
    renderInventory();
});

/* ============================================================
   КЛИКИ ПО СЛОТАМ
   ============================================================ */
$('sourceSlot').addEventListener('click', function() {
    if (state.upgradeSource) return;
    unlockAudio(); sClick();
    var panel = document.querySelector('.upg-inv-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

$('targetSlot').addEventListener('click', function() {
    if (state.upgradeTarget) return;
    unlockAudio(); sClick();
    var panel = document.querySelector('.upg-items-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

$('sourceRemoveBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    unlockAudio(); sClick();
    state.upgradeSource = null;
    state.upgradeTarget = null;
    state.selectedPreset = null;
    renderSourceSlot();
    renderTargetSlot();
    renderInvPanel();
    renderPresets();
    updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
    setNeedleAngle(0);
    DOM.upgradeBtn.disabled = true;
});

$('targetRemoveBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    unlockAudio(); sClick();
    state.upgradeTarget = null;
    state.selectedPreset = null;
    renderTargetSlot();
    renderPresets();
    updateCircleFromPreset();
});

/* ============================================================
   ФИЛЬТРЫ ПАНЕЛЕЙ
   ============================================================ */
function initPanelFilters(containerId, filterKey, callback) {
    var container = $(containerId);
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

initPanelFilters('invPanelFilters', 'invPanelFilter', renderInvPanel);
initPanelFilters('itemsPanelFilters', 'itemsPanelFilter', renderItemsPanel);

$('invSearch').addEventListener('input', function() { renderInvPanel(); });
$('itemsSearch').addEventListener('input', function() { renderItemsPanel(); });

/* ============================================================
   МАГАЗИН
   ============================================================ */
var _shopVisibleCount = 20;
function renderShop() {
    var grid = $('shopGrid');
    var items = SKINS.slice();
    if (state.shopFilter !== 'all') items = items.filter(function(s) { return s.rarity === state.shopFilter; });
    var rarityOrder = {common:0,uncommon:1,rare:2,epic:3,legendary:4,mythical:5};
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
        el.innerHTML = renderSkinIcon(skin) +
            '<div class="name">' + skin.name + '</div>' +
            '<div class="rarity-label" style="color:' + RARITIES[skin.rarity].color + '">' + RARITIES[skin.rarity].name + '</div>' +
            '<div class="price-row"><span style="font-size:0.9rem">💰</span><span class="price">' + formatUah(shopPrice) + '</span></div>' +
            '<button class="buy-btn" ' + (canAfford ? '' : 'disabled') + '>' + (canAfford ? 'КУПИТЬ' : 'НЕ ХВАТАЕТ') + '</button>';
        el.querySelector('.buy-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            if (!canAfford) { log('❌ Недостаточно средств', 'lose'); sLose(); return; }
            openBuyModal(skin, shopPrice);
        });
        frag.appendChild(el);
    });
    if (items.length > _shopVisibleCount) {
        var more = document.createElement('button');
        more.className = 'btn-secondary';
        more.textContent = 'Показать ещё (' + (items.length - _shopVisibleCount) + ')';
        more.style.gridColumn = '1/-1';
        more.style.marginTop = '16px';
        more.addEventListener('click', function() {
            _shopVisibleCount += 20;
            renderShop();
        });
        frag.appendChild(more);
    }
    grid.replaceChildren(frag);
}

function openBuyModal(skin, price) {
    unlockAudio(); sClick();
    pendingPurchase = { skin: skin, price: price };
    $('buyIcon').innerHTML = renderSkinIcon(skin);
    $('buyTitle').textContent = skin.name;
    $('buySub').textContent = RARITIES[skin.rarity].name + ' · Купить?';
    $('buyPrice').textContent = formatUah(price);
    $('buyModal').classList.add('show');
}
var pendingPurchase = null;

/* ============================================================
   ИНВЕНТАРЬ (page)
   ============================================================ */
var invFilter = 'all';
function renderInventory() {
    var inv = $('inventory');
    if (state.inventory.length === 0) { inv.innerHTML = '<div class="empty-inv">Инвентарь пуст!<br><br>Купи скины в магазине.</div>'; return; }
    var sorted = state.inventory.slice().sort(function(a,b) { return b.price - a.price; });
    if (invFilter !== 'all') sorted = sorted.filter(function(s) { return s.rarity === invFilter; });
    if (sorted.length === 0) { inv.innerHTML = '<div class="empty-inv">Ничего не найдено</div>'; return; }
    var frag = document.createDocumentFragment();
    sorted.forEach(function(skin) {
        var el = document.createElement('div');
        el.className = 'inv-item ' + skin.rarity;
        el.innerHTML = renderSkinIcon(skin) +
            '<div class="name">' + skin.name + '</div>' +
            '<div class="price">' + formatUah(skin.price) + '</div>' +
            '<button class="sell-btn">Продать</button>';
        el.querySelector('.sell-btn').addEventListener('click', function(e) { e.stopPropagation(); sellSkin(skin); });
        frag.appendChild(el);
    });
    inv.replaceChildren(frag);
}

function sellSkin(skin) {
    var idx = state.inventory.indexOf(skin); if (idx < 0) return;
    state.inventory.splice(idx, 1); state.balance += skin.price;
    updateUI(); renderInventory(); renderInvPanel(); sClick();
    log('💰 Продано: ' + skin.name + ' +' + formatUah(skin.price), 'info');
}

/* ============================================================
   ОБРАБОТЧИКИ
   ============================================================ */
load();

$('resultContinue').addEventListener('click', closeResult);

$('soundBtn').addEventListener('click', function() {
    state.soundOn = !state.soundOn;
    $('soundIcon').textContent = state.soundOn ? '🔊' : '🔇';
    if (state.soundOn) { unlockAudio(); sClick(); }
    save();
});

$('resetAllBtn').addEventListener('click', function() {
    if (!confirm('Сбросить весь прогресс?')) return;
    localStorage.removeItem('rastrgrade_v25');
    location.reload();
});

$('buyCancel').addEventListener('click', function() {
    sClick(); $('buyModal').classList.remove('show'); pendingPurchase = null;
});

$('buyConfirm').addEventListener('click', function() {
    if (!pendingPurchase) return;
    var skin = pendingPurchase.skin; var price = pendingPurchase.price;
    if (state.balance < price) { log('❌ Недостаточно средств', 'lose'); sLose(); return; }
    state.balance -= price;
    state.inventory.push(skin);
    state.purchases++;
    state.totalLost += price; state.profit -= price;
    state.housePlayerLost += price;
    addXP(10); sBuy();
    log('🛒 Куплено: ' + skin.name + ' за ' + formatUah(price), 'win');
    $('buyModal').classList.remove('show'); pendingPurchase = null;
    updateUI(); renderShop(); renderInventory(); renderInvPanel();
});

$('sellAllBtn').addEventListener('click', function() {
    if (state.inventory.length === 0) return;
    var total = state.inventory.reduce(function(s, i) { return s + i.price; }, 0);
    state.balance += total; state.inventory = [];
    updateUI(); renderInventory(); renderInvPanel(); sBuy();
    log('💰 Продано: +' + formatUah(total), 'win');
});

$('shopSort').addEventListener('change', function(e) {
    state.shopSort = e.target.value; _shopVisibleCount = 20;
    renderShop(); save(); sClick();
});

document.querySelectorAll('.shop-filter').forEach(function(btn) {
    btn.addEventListener('click', function() {
        unlockAudio(); sClick();
        document.querySelectorAll('.shop-filter').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active'); state.shopFilter = btn.dataset.rarity;
        _shopVisibleCount = 20;
        renderShop(); save();
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
        unlockAudio(); sClick();
        stopAllLoopSounds();
        document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
        tab.classList.add('active');
        $('page-' + tab.dataset.page).classList.add('active');
        if (tab.dataset.page === 'shop') { _shopVisibleCount = 20; renderShop(); }
        if (tab.dataset.page === 'inventory') renderInventory();
        if (tab.dataset.page === 'upgrade') { renderInvPanel(); renderItemsPanel(); }
    });
});

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopAllLoopSounds();
    }
});

var shopFilterBtn = document.querySelector('.shop-filter[data-rarity="' + state.shopFilter + '"]');
if (shopFilterBtn) {
    document.querySelectorAll('.shop-filter').forEach(function(b) { b.classList.remove('active'); });
    shopFilterBtn.classList.add('active');
}
$('shopSort').value = state.shopSort;
$('soundIcon').textContent = state.soundOn ? '🔊' : '🔇';

/* ============ INITIAL RENDER ============ */
renderSourceSlot();
renderTargetSlot();
renderPresets();
renderInvPanel();
renderItemsPanel();
renderShop();
updateUI();
renderInventory();
updateCircleChance(0, 'ВЫБЕРИ ПРЕДМЕТ', '');
setNeedleAngle(0);

document.body.addEventListener('click', function() { unlockAudio(); }, { once: true });
