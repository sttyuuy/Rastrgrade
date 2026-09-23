(function(){
'use strict';

/* ============================================================
   FIRESTORE PRICES — КЕШІ І ІНДЕКСИ
   ============================================================ */
var _firestorePrices = {};
window._skinsByName = {};
window._skinsById = {};
var _priceCache = {};
var _sortedShopCache = { key: '', data: null };
var _sortedInvCache = { key: '', data: null };
var _tgCache = {};

function _norm(s){
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi,'');
}

function _findSkinPrice(steamName){
    if(!steamName) return 0;
    var key = _norm(steamName);
    if(_firestorePrices[key] !== undefined) return _firestorePrices[key];
    if(window._skinsByName[key] !== undefined) return window._skinsByName[key].price || 0;
    return 0;
}

function _a1(s){
    if(!s) return 0;
    if(s.id && _priceCache[s.id] !== undefined) return _priceCache[s.id];
    var fsPrice = _findSkinPrice(s.name);
    var result = fsPrice > 0 ? fsPrice : (s.price || 0);
    if(s.id) _priceCache[s.id] = result;
    return result;
}

function _clearCaches(){
    _priceCache = {};
    _tgCache = {};
    _sortedShopCache = { key: '', data: null };
    _sortedInvCache = { key: '', data: null };
}

async function loadPricesFromFirestore(){
    if(!window.fbDb) return;
    try{
        window._skinsByName = {};
        window._skinsById = {};
        if(window.SKINS){
            window.SKINS.forEach(function(s){
                window._skinsByName[_norm(s.name)] = s;
                window._skinsById[s.id] = s;
            });
        }
        var snap = await window.fbGetDocs(window.fbCollection(window.fbDb,'skins'));
        var count = 0;
        _firestorePrices = {};
        snap.forEach(function(doc){
            var d = doc.data();
            if(d.name && d.price){
                _firestorePrices[_norm(d.name)] = d.price;
                count++;
            }
        });
        _clearCaches();
        console.log('✅ Загружено цен из Firestore:', count);
        if(typeof _rsh === 'function') _rsh();
        if(typeof _rinv === 'function') _rinv();
        if(typeof _ri === 'function') _ri();
        if(typeof _rt2 === 'function') _rt2();
        if(typeof _ui === 'function') _ui();
    }catch(e){
        console.error('Firestore prices error:', e);
    }
}

var _P=[{mult:1.5,label:'x1.5'},{mult:2,label:'x2'},{mult:3,label:'x3'},{mult:5,label:'x5'},{mult:10,label:'x10'},{mult:20,label:'x20'},{mult:50,label:'x50'},{mult:100,label:'x100'},{mult:500,label:'x500'}];
var _L=[{lvl:1,xp:0,name:'НОВИЧОК'},{lvl:2,xp:1000,name:'ЛЮБИТЕЛЬ'},{lvl:3,xp:5000,name:'ИГРОК'},{lvl:4,xp:15000,name:'ПРОФИ'},{lvl:5,xp:40000,name:'ЭКСПЕРТ'},{lvl:6,xp:100000,name:'МАСТЕР'},{lvl:7,xp:250000,name:'ГУРУ'},{lvl:8,xp:500000,name:'ЛЕГЕНДА'},{lvl:9,xp:1000000,name:'ТИТАН'},{lvl:10,xp:2500000,name:'БОГ КАЗИНО'}];
var _MX=999999;
var _CU=null,_CT=null,_SAVE_TIMER=null;
var _UDN='';var _UPA='';
var _ndl=null;
var _needleAngle=0;
var _BUSY = false;

var _MF='https://api.yrsproject.ru/public/image/Resize?shortname=metal.fragments&x=64&y=64';
var _MF_ICON='<img src="'+_MF+'" style="width:22px;height:22px;vertical-align:middle;display:inline-block" alt="">';
var _MF_ICON_BIG='<img src="'+_MF+'" style="width:32px;height:32px;vertical-align:middle;display:inline-block" alt="">';

function _fb(){
    if(!window.fbReady){setTimeout(_fb,100);return;}
    window.fbOnAuthStateChanged(window.fbAuth,async function(u){
        if(u){
            _CU={uid:u.uid,email:u.email,displayName:u.displayName,photoURL:u.photoURL};
            try {
                var idToken = await u.getIdToken();
                if(window.apiClient) window.apiClient.setAuthToken(idToken);
            } catch(e) { console.error('token err', e); }

            _ca();_rs();await _lc();_ra();_ub();
            _lg('Добро пожаловать!','win');
        }else{
            _CU=null;_UDN='';_UPA='';
            _clearCaches();
            if(window.apiClient) window.apiClient.clearAuthToken();
            _rs();_ra();_ub();_oa();
        }
    });
    var g=document.getElementById('googleLoginBtn');
    if(g)g.addEventListener('click',async function(){
        try{await window.fbSignInWithPopup(window.fbAuth,window.fbGoogleProvider);}
        catch(e){
            console.error(e);
            var er=document.getElementById('authError');
            if(er){
                if(e.code==='auth/popup-blocked')er.textContent='Браузер заблокировал окно.';
                else if(e.code==='auth/unauthorized-domain')er.textContent='Домен не добавлен в Firebase.';
                else er.textContent='Ошибка: '+(e.message||e.code);
            }
        }
    });
    var sb=document.getElementById('steamLoginBtn');
    if(sb)sb.addEventListener('click',function(){
        window.location.href = window.apiClient.getSteamAuthUrl();
    });
}

async function _lc(){
    if(!_CU) return;
    try{
        var data = await window.apiClient.getUserData();

        state.balance = data.balance || 0;
        state.inventory = (data.inventory || []).map(function(i){
            if(!i.svg && window._skinsById[i.id]){
                i.svg = window._skinsById[i.id].svg;
            }
            return i;
        });
        state.totalWon = data.totalWon || 0;
        state.totalLost = data.totalLost || 0;
        state.totalSold = data.totalSold || 0;
        state.profit = data.profit || 0;
        state.upgrades = data.upgrades || 0;
        state.purchases = data.purchases || 0;
        state.housePlayerLost = data.housePlayerLost || 0;
        state.houseCasinoWon = data.houseCasinoWon || 0;
        state.bestDrop = data.bestDrop ? (window._skinsById[data.bestDrop.id] || resolveSkin(data.bestDrop)) : null;
        state.bestUpgrade = data.bestUpgrade ? (window._skinsById[data.bestUpgrade.id] || resolveSkin(data.bestUpgrade)) : null;
        state.xp = data.xp || 0;
        state.level = data.level || 1;

        _sortedInvCache = { key: '', data: null };

        try {
            var ui = JSON.parse(localStorage.getItem('rastrgrade_ui') || '{}');
            if(ui.soundOn !== undefined) state.soundOn = ui.soundOn;
            if(ui.shopFilter) state.shopFilter = ui.shopFilter;
            if(ui.shopSort) state.shopSort = ui.shopSort;
            if(ui.spinSpeed) state.spinSpeed = ui.spinSpeed;
        } catch(e){}

        if(data.displayName) _UDN = data.displayName;
        if(data.photoURL) _UPA = data.photoURL;

    } catch(e) {
        console.error('[lc] API error:', e);
        try {
            var r = window.fbDoc(window.fbDb,'users',_CU.uid);
            var s = await window.fbGetDoc(r);
            if(s.exists()){
                var d = s.data();
                state.balance = d.balance || 0;
                state.inventory = (d.inventory || []).map(resolveSkin).filter(Boolean);
                state.totalWon = d.totalWon || 0;
                state.totalLost = d.totalLost || 0;
                state.profit = d.profit || 0;
                state.upgrades = d.upgrades || 0;
                state.purchases = d.purchases || 0;
                state.housePlayerLost = d.housePlayerLost || 0;
                state.houseCasinoWon = d.houseCasinoWon || 0;
                state.bestDrop = d.bestDrop ? resolveSkin(d.bestDrop) : null;
                state.bestUpgrade = d.bestUpgrade ? resolveSkin(d.bestUpgrade) : null;
                state.xp = d.xp || 0;
                state.level = d.level || 1;
            }
        } catch(fallbackErr) {
            console.error('[lc] fallback error:', fallbackErr);
            state.balance = START_BALANCE;
        }
    }
}

function save(){
    if(!_CU) return;
    if(_SAVE_TIMER) clearTimeout(_SAVE_TIMER);
    _SAVE_TIMER = setTimeout(function(){
        try {
            localStorage.setItem('rastrgrade_ui', JSON.stringify({
                soundOn: state.soundOn,
                shopFilter: state.shopFilter,
                shopSort: state.shopSort,
                spinSpeed: state.spinSpeed
            }));
        } catch(e){}
    }, 300);
}

function _ol(){var m=document.getElementById('logoutModal');if(m)m.classList.add('show');}
function _cl(){var m=document.getElementById('logoutModal');if(m)m.classList.remove('show');}
async function _lo(){_cl();try{await window.fbSignOut(window.fbAuth);_lg('Вы вышли','info');}catch(e){console.error(e);}}

function _ub(){
    var b=document.getElementById('userBadge');
    var i=document.getElementById('userBadgeIcon');
    if(!b||!i)return;
    if(_CU){
        b.title='Выйти';
        if(_UPA){i.innerHTML='<img src="'+_UPA+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';}
        else{i.textContent='X';}
    }else{b.title='Войти';i.textContent='?';}
}
function _oa(){var m=document.getElementById('authModal');if(m)m.classList.add('show');}
function _ca(){var m=document.getElementById('authModal');if(m)m.classList.remove('show');}

var state={
    balance:0,inventory:[],profit:0,
    totalWon:0,totalLost:0,totalSold:0,upgrades:0,purchases:0,
    bestDrop:null,bestUpgrade:null,
    upgradeSource:null,upgradeTarget:null,selectedPreset:null,
    spinSpeed:'slow',
    housePlayerLost:0,houseCasinoWon:0,
    xp:0,level:1,
    soundOn:true,
    shopFilter:'all',shopSort:'price-asc',
    invPanelFilter:'all',itemsPanelFilter:'all',
    upgrading:false
};

function _rs(){
    state.balance=0;state.inventory=[];state.profit=0;
    state.totalWon=0;state.totalLost=0;state.totalSold=0;state.upgrades=0;state.purchases=0;
    state.bestDrop=null;state.bestUpgrade=null;
    state.upgradeSource=null;state.upgradeTarget=null;state.selectedPreset=null;
    state.spinSpeed='slow';
    state.housePlayerLost=0;state.houseCasinoWon=0;
    state.xp=0;state.level=1;
    state.shopFilter='all';state.shopSort='price-asc';
    state.invPanelFilter='all';state.itemsPanelFilter='all';
    state.upgrading=false;
}
function $(i){return document.getElementById(i);}

/* ============================================================
   ЗВУКИ
   ============================================================ */
var _SF={
    spin:'/assets/spin.mp3',
    win_common:'/assets/win_common.mp3',
    win_legendary:'/assets/win_legendary.mp3',
    click:'/assets/click.mp3',
    buy:'/assets/buy.mp3',
    levelup:'/assets/levelup.mp3'
};
var _SD={};var _AU=false;var _SD_LOADED=false;
var _SD_DUR={};

function _pl(){
    if(_SD_LOADED) return;
    _SD_LOADED = true;
    Object.keys(_SF).forEach(function(k){
        var a=new Audio();
        a.src=_SF[k];
        a.preload='auto';
        a.volume=0.7;
        a.addEventListener('loadedmetadata', function(){
            _SD_DUR[k] = a.duration * 1000;
        });
        _SD[k]=a;
    });
}
function _un(){
    if(_AU)return;
    _AU=true;
    Object.keys(_SD).forEach(function(k){
        var s=_SD[k];if(!s)return;
        s.volume=0;
        s.play().then(function(){s.pause();s.currentTime=0;s.volume=0.7;}).catch(function(){});
    });
}
function _sn(n,v){
    if(!state.soundOn)return;
    var s=_SD[n];if(!s)return;
    try{var c=s.cloneNode();c.volume=v||0.7;c.play().catch(function(){});}catch(e){}
}
function _ck(){_sn('click',0.6);}
function _wn(r){if(r==='legendary'||r==='mythical')_sn('win_legendary',0.9);else _sn('win_common',0.8);}
function _ls(){}
function _by(){_sn('buy',0.8);}
function _lu(){_sn('levelup',0.9);}

var _LP={};
function _sp(n,v,targetMs){
    if(!state.soundOn)return null;
    var s=_SD[n];if(!s)return null;
    if(_LP[n]){try{_LP[n].pause();_LP[n].currentTime=0;}catch(e){}}
    var c=s.cloneNode();
    c.volume=v||0.6;

    var natural = _SD_DUR[n];
    if(targetMs && natural && natural>0){
        c.loop = false;
        c.playbackRate = Math.max(0.4, Math.min(3, natural / targetMs));
    } else {
        c.loop = true;
    }

    c.play().catch(function(){});
    _LP[n]=c;
    var thisAudio = c;
    var thisName = n;
    return{
        stop:function(){
            if(thisAudio){
                try{thisAudio.pause();thisAudio.currentTime=0;}catch(e){}
                if(_LP[thisName] === thisAudio) _LP[thisName] = null;
            }
        },
        fadeStop:function(d){
            d=d||250;
            var a=thisAudio;if(!a)return;
            var sv=a.volume;var st=performance.now();
            var iv=setInterval(function(){
                var t=(performance.now()-st)/d;
                if(t>=1){
                    clearInterval(iv);
                    try{a.pause();a.currentTime=0;}catch(e){}
                    if(_LP[thisName] === a) _LP[thisName] = null;
                    return;
                }
                a.volume=Math.max(0,sv*(1-t));
            },30);
        }
    };
}
function _sl(){
    Object.keys(_LP).forEach(function(k){
        if(_LP[k]){
            try{_LP[k].pause();_LP[k].currentTime=0;}catch(e){}
            _LP[k]=null;
        }
    });
}

function _lg(m,t){
    t=t||'info';
    var w=$('toastWrap');if(!w)return;
    while(w.children.length>=5)w.removeChild(w.firstChild);
    var e=document.createElement('div');
    e.className='toast '+t;
    var icon = t==='win' ? 'OK' : t==='lose' ? 'X' : t==='jackpot' ? '★' : 'i';
    e.innerHTML='<span class="toast-icon">'+icon+'</span><span>'+m+'</span>';
    w.appendChild(e);
    setTimeout(function(){
        e.style.transition='all 0.4s';
        e.style.opacity='0';
        e.style.transform='translateX(120%)';
        setTimeout(function(){e.remove();},400);
    },3500);
}

function _ch(sp,tp){var c=(sp/tp)*100*0.90;if(c>95)c=95;if(c<0.01)c=0.01;return c;}

function _tg(tp,ss){
    var key = tp + '|' + (ss ? ss.id : '');
    if(_tgCache[key]) return _tgCache[key];
    var b=null,bd=Infinity;
    for(var i=0; i<SKINS.length; i++){
        var s = SKINS[i];
        if(ss && s.id === ss.id) continue;
        var sp = _a1(s);
        if(ss && sp <= _a1(ss)) continue;
        var d = Math.abs(sp - tp);
        if(d < bd){ bd = d; b = s; }
    }
    _tgCache[key] = b;
    return b;
}

function _xp(n){state.xp+=n;var p=state.level;for(var i=_L.length-1;i>=0;i--){if(state.xp>=_L[i].xp){state.level=_L[i].lvl;break;}}if(state.level>p){for(var l=p+1;l<=state.level;l++){_lg('Уровень '+l+'!','win');}_lu();}}

function _rz(){state.upgradeSource=null;state.upgradeTarget=null;state.selectedPreset=null;_rs1();_rt1();_rp1();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);if(DOM.upgradeBtn)DOM.upgradeBtn.disabled=true;}

var DOM={};
function _cd(){['balance','profit','invCount','invValue','statTotalWon','statTotalLost','statUpgrades','statPurchases','statBestDrop','statBestUpgrade','housePlayer','houseCasino','levelBadge','levelName','levelBarFill','sourcePriceLabel','targetPriceLabel','sourceSlot','targetSlot','sourceRemoveBtn','targetRemoveBtn','circlePercent','circleStatus','presetContainer','invPanelCount','invPanelList','targetsCount','itemsPanelGrid','invSearch','itemsSearch','upgradeBtn','speedSlowBtn','speedFastBtn','userBadge'].forEach(function(i){DOM[i]=$(i);});DOM.shopBalance=$('shopBalance');}
_cd();

function _ui(){
    if(!DOM.balance)return;
    DOM.balance.innerHTML=formatRastr(state.balance)+' '+_MF_ICON;
    if(DOM.shopBalance)DOM.shopBalance.innerHTML=formatRastr(state.balance)+' '+_MF_ICON;
    var p=DOM.profit;
    p.innerHTML=(state.profit>=0?'+':'')+formatRastr(state.profit)+' '+_MF_ICON;
    p.className='hud-stat-value '+(state.profit>=0?'green':'red');
    DOM.invCount.textContent=state.inventory.length;
    var invSum = 0;
    for(var i=0;i<state.inventory.length;i++) invSum += _a1(state.inventory[i]);
    DOM.invValue.innerHTML=formatRastr(invSum)+' '+_MF_ICON;
    DOM.statTotalWon.innerHTML=formatRastr(state.totalWon)+' '+_MF_ICON;
    DOM.statTotalLost.innerHTML=formatRastr(state.totalLost)+' '+_MF_ICON;
    DOM.statUpgrades.textContent=state.upgrades;
    DOM.statPurchases.textContent=state.purchases;
    DOM.statBestDrop.textContent=state.bestDrop?state.bestDrop.name+' '+formatRastr(_a1(state.bestDrop)):'—';
    DOM.statBestUpgrade.textContent=state.bestUpgrade?state.bestUpgrade.name+' '+formatRastr(_a1(state.bestUpgrade)):'—';
    DOM.housePlayer.innerHTML=formatRastr(state.housePlayerLost)+' '+_MF_ICON;
    DOM.houseCasino.innerHTML=formatRastr(state.houseCasinoWon)+' '+_MF_ICON;
    DOM.levelBadge.textContent=state.level;
    var li=_L.findIndex(function(l){return l.lvl===state.level;});
    var l=_L[li];var n=_L[li+1];
    DOM.levelName.textContent=l.name;
    if(n){var pr=(state.xp-l.xp)/(n.xp-l.xp)*100;DOM.levelBarFill.style.width=Math.min(100,Math.max(0,pr))+'%';}
    else DOM.levelBarFill.style.width='100%';
}
