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
   function _sr(o){
    var inn=$('resultInner');
    inn.className='modal-inner result-inner '+o.type;
    if(o.skin){
        $('resultIcon').innerHTML='';$('resultIcon').style.display='none';
        $('resultSkin').innerHTML='<div class="item '+o.skin.rarity+'" style="margin:0 auto;display:inline-flex;border:none;background:transparent;min-width:auto;height:auto;padding:0">'+renderSkinIcon(o.skin)+'<div style="margin-top:12px"><div class="name" style="font-size:0.85rem">'+o.skin.name+'</div><div class="price" style="font-size:1rem;margin-top:6px">'+formatRastr(_a1(o.skin))+' '+_MF_ICON+'</div></div></div>';
    }else{
        $('resultIcon').textContent=o.icon;$('resultIcon').style.display='block';$('resultSkin').innerHTML='';
    }
    $('resultTitle').textContent=o.title;
    $('resultValue').innerHTML=o.value;
    var sb=$('resultSell');
    if(o.canSell&&o.skin){sb.style.display='inline-block';sb.onclick=function(){if(o.sellCallback)o.sellCallback();_cr();};}
    else sb.style.display='none';
    if(o.type==='result-win'||o.type==='result-jackpot'){
        var w=$('resultParticles');w.innerHTML='';
        var cs=o.type==='result-jackpot'?['#f5c542','#ffdd88','#ff6b1a']:['#00e676','#4aa8ff','#a55cff'];
        for(var i=0;i<12;i++){
            var p=document.createElement('div');p.className='particle';
            var a=Math.random()*Math.PI*2;var d=120+Math.random()*180;
            p.style.setProperty('--dx',Math.cos(a)*d+'px');
            p.style.setProperty('--dy',Math.sin(a)*d+'px');
            p.style.background=cs[Math.floor(Math.random()*cs.length)];
            p.style.left='50%';p.style.top='50%';
            p.style.animationDelay=(Math.random()*0.4)+'s';
            w.appendChild(p);
        }
    }
    $('resultModal').classList.add('show');
}
function _cr(){_ck();$('resultModal').classList.remove('show');}

var _CR=100;var _CC=2*Math.PI*_CR;
function _dc(c){c=Math.max(0,Math.min(100,c));var l=(c/100)*_CC;$('chanceSector').setAttribute('stroke-dasharray',l+' '+_CC);var co;if(c>=65)co='#7ed321';else if(c>=35)co='#f5c542';else if(c>=15)co='#ff6b1a';else co='#ff3b3b';$('chanceSector').style.color=co;}

function _na(d){
    if(!_ndl) _ndl = $('circleNeedle');
    _needleAngle = d;
    if(_ndl) _ndl.style.transform = 'rotate(' + d + 'deg) translateZ(0)';
}

function _cc(c,t,k){_dc(c);$('circlePercent').textContent=Math.round(c)+'%';var s=$('circleStatus');s.textContent=t||'';s.className='upg-status '+(k||'');var co;if(c>=65)co='#7ed321';else if(c>=35)co='#f5c542';else if(c>=15)co='#ff6b1a';else co='#ff3b3b';$('circlePercent').style.color=co;}
function _rs1(){var s=$('sourceSlot');if(!s)return;if(state.upgradeSource){s.className='upg-item-slot filled '+state.upgradeSource.rarity;s.innerHTML=renderSkinIcon(state.upgradeSource)+'<div class="upg-item-name">'+state.upgradeSource.name+'</div><div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeSource.rarity].color+'">'+RARITIES[state.upgradeSource.rarity].name+'</div>';$('sourcePriceLabel').innerHTML=formatRastr(_a1(state.upgradeSource))+' '+_MF_ICON;$('sourceRemoveBtn').style.display='block';}else{s.className='upg-item-slot';s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Выбрать предмет</div></div>';$('sourcePriceLabel').textContent='—';$('sourceRemoveBtn').style.display='none';}}
function _rt1(){var s=$('targetSlot');if(!s)return;if(state.upgradeTarget){s.className='upg-item-slot filled '+state.upgradeTarget.rarity;s.innerHTML=renderSkinIcon(state.upgradeTarget)+'<div class="upg-item-name">'+state.upgradeTarget.name+'</div><div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeTarget.rarity].color+'">'+RARITIES[state.upgradeTarget.rarity].name+'</div>';$('targetPriceLabel').innerHTML=formatRastr(_a1(state.upgradeTarget))+' '+_MF_ICON;$('targetRemoveBtn').style.display='block';}else{s.className='upg-item-slot';s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">?</div><div class="upg-item-empty-text">Цель</div></div>';$('targetPriceLabel').textContent='—';$('targetRemoveBtn').style.display='none';}}
function _uc(){if(!state.upgradeSource||!state.upgradeTarget){_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);DOM.upgradeBtn.disabled=true;return;}var c=_ch(_a1(state.upgradeSource),_a1(state.upgradeTarget));state.upgradeTarget._realChance=c;var s,sc;if(c>=60){s='ВЫСОКИЙ ШАНС';sc='win';}else if(c>=30){s='СРЕДНИЙ ШАНС';sc='';}else if(c>=10){s='РИСК';sc='';}else if(c>=1){s='ХАЙ РИСК';sc='lose';}else{s='ПОЧТИ НЕВОЗМОЖНО';sc='lose';}_cc(c,s,sc);_na(0);DOM.upgradeBtn.disabled=false;}
function _rp1(){var cn=$('presetContainer');if(!cn)return;var f=document.createDocumentFragment();var hs=!!state.upgradeSource;_P.forEach(function(p,i){var b=document.createElement('button');b.className='upg-preset-btn';b.disabled=!hs;b.dataset.idx=i;var dt='—';if(hs){var sp=_a1(state.upgradeSource);var tp=sp*p.mult;var t=_tg(tp,state.upgradeSource);if(t&&_a1(t)>sp){var rc=_ch(sp,_a1(t));if(rc>=10)dt=Math.round(rc)+'%';else dt=rc.toFixed(2)+'%';}}b.innerHTML='<span class="upg-preset-mult">'+p.label+'</span><span class="upg-preset-chance">'+dt+'</span>';if(state.selectedPreset===i)b.classList.add('active');b.addEventListener('click',function(e){e.stopPropagation();_sp2(i);});f.appendChild(b);});cn.replaceChildren(f);}
function _sp2(i){if(!state.upgradeSource){_lg('Сначала выбери предмет','lose');_ck();return;}_un();_ck();if(_a1(state.upgradeSource)>=_MX*0.99){_lg('Это максимальный скин','lose');return;}var p=_P[i];var sp=_a1(state.upgradeSource);var tp=sp*p.mult;var t=_tg(tp,state.upgradeSource);if(!t||_a1(t)<=sp){_lg('Нет подходящей цели','lose');return;}if(_a1(t)>_MX){_lg('Нет цели','lose');return;}state.upgradeTarget=t;state.selectedPreset=i;state.upgradeTarget._realChance=_ch(sp,_a1(t));_rt1();_rp1();_uc();}
function _ri(){var l=$('invPanelList');if(!l)return;var f=state.invPanelFilter;var s=($('invSearch').value||'').toLowerCase();var sr=state.inventory.slice().sort(function(a,b){return _a1(b)-_a1(a);});if(f!=='all')sr=sr.filter(function(x){return x.rarity===f;});if(s)sr=sr.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});$('invPanelCount').textContent=state.inventory.length+' шт.';if(sr.length===0){l.innerHTML='<div class="upg-inv-empty">Инвентарь пуст</div>';return;}var fr=document.createDocumentFragment();sr.forEach(function(sk){var e=document.createElement('div');e.className='upg-inv-item '+sk.rarity;if(state.upgradeSource&&state.upgradeSource===sk)e.classList.add('used');e.innerHTML=renderSkinIcon(sk)+'<div class="upg-inv-name">'+sk.name+'</div><div class="upg-inv-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';e.addEventListener('click',function(){_un();_ck();state.upgradeSource=sk;state.upgradeTarget=null;state.selectedPreset=null;_tgCache={};_rs1();_rt1();_ri();_rp1();_uc();});fr.appendChild(e);});l.replaceChildren(fr);}
function _rt2(){var g=$('itemsPanelGrid');if(!g)return;var f=state.itemsPanelFilter;var s=($('itemsSearch').value||'').toLowerCase();var it=SKINS.slice();if(f!=='all')it=it.filter(function(x){return x.rarity===f;});if(s)it=it.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});$('targetsCount').textContent=it.length;if(it.length===0){g.innerHTML='<div class="upg-inv-empty" style="grid-column:1/-1">Ничего не найдено</div>';return;}var fr=document.createDocumentFragment();it.forEach(function(sk){var e=document.createElement('div');e.className='upg-target-item '+sk.rarity;if(state.upgradeTarget&&state.upgradeTarget.id===sk.id){e.style.borderColor='#f5c542';e.style.boxShadow='0 0 20px rgba(245,197,66,0.5)';}e.innerHTML=renderSkinIcon(sk)+'<div class="upg-target-name">'+sk.name+'</div><div class="upg-target-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';e.addEventListener('click',function(){if(!state.upgradeSource){_lg('Сначала выбери свой предмет','lose');_ck();return;}if(sk.id===state.upgradeSource.id){_lg('Нельзя апгрейдить в себя','lose');_ck();return;}if(_a1(sk)<=_a1(state.upgradeSource)){_lg('Цель должна быть дороже','lose');_ck();return;}if(_a1(sk)>_MX){_lg('Нет цели','lose');_ck();return;}_un();_ck();state.upgradeTarget=sk;state.selectedPreset=null;state.upgradeTarget._realChance=_ch(_a1(state.upgradeSource),_a1(sk));_rt1();_rp1();_uc();});fr.appendChild(e);});g.replaceChildren(fr);}

/* ============================================================
   _pa — МАКСИМАЛЬНО ПЛАВНА АНІМАЦІЯ (60 FPS, GPU)
   ============================================================ */
var _paRAF = null;

function _pa(c, w){
    return new Promise(function(res){
        if(_paRAF){ cancelAnimationFrame(_paRAF); _paRAF = null; }

        var d = state.spinSpeed === 'fast' ? 2600 : 4800;
        var sectorEnd = c * 3.6;
        var SAFE_GAP = 5;

        var fa;
        if(w){
            var lo = SAFE_GAP;
            var hi = Math.max(lo + 1, sectorEnd - SAFE_GAP);
            if(hi <= lo) hi = sectorEnd / 2;
            var mid = (lo + hi) / 2;
            fa = mid + (Math.random() - 0.5) * (hi - lo) * 0.9;
        } else {
            var lo2 = sectorEnd + SAFE_GAP;
            var hi2 = 360 - SAFE_GAP;
            if(lo2 >= hi2){
                fa = (sectorEnd + 180) % 360;
            } else {
                var mid2 = (lo2 + hi2) / 2;
                fa = mid2 + (Math.random() - 0.5) * (hi2 - lo2) * 0.9;
            }
        }
        fa = ((fa % 360) + 360) % 360;

        var fs = state.spinSpeed === 'fast'
            ? 6 + Math.floor(Math.random() * 3)
            : 10 + Math.floor(Math.random() * 4);

        var currentAngle = _needleAngle || 0;
        var target = currentAngle + fs * 360 + ((fa - (currentAngle % 360)) + 360) % 360;

        var st = performance.now();
        var sd = _sp('spin', 0.55, d);

        if(!_ndl) _ndl = $('circleNeedle');

        function easeOutQuint(t){
            return 1 - Math.pow(1 - t, 5);
        }

        var TOTAL = target - currentAngle;
        var LAST_ANGLE = -1;

        function an(now){
            var t = (now - st) / d;
            if(t > 1) t = 1;

            var ez = easeOutQuint(t);
            var angle = currentAngle + TOTAL * ez;

            if(Math.abs(angle - LAST_ANGLE) > 0.1){
                LAST_ANGLE = angle;
                _needleAngle = angle;
                if(_ndl) _ndl.style.transform = 'rotate(' + angle + 'deg) translateZ(0)';
            }

            if(t < 1){
                _paRAF = requestAnimationFrame(an);
            } else {
                _needleAngle = fa;
                if(_ndl) _ndl.style.transform = 'rotate(' + fa + 'deg) translateZ(0)';
                _paRAF = null;

                if(sd) sd.stop();

                var s = $('circleStatus');
                if(w){ s.textContent='ПОБЕДА'; s.className='upg-status win'; }
                else { s.textContent='ПРОВАЛ'; s.className='upg-status lose'; }

                setTimeout(res, 700);
            }
        }

        _paRAF = requestAnimationFrame(an);
    });
}

/* ============================================================
   _hu — апгрейд
   ============================================================ */
async function _hu(){
    if(_BUSY) return;
    if(!state.upgradeSource||!state.upgradeTarget)return;
    if(state.upgrading)return;
    if(!_CU){_lg('Войди в аккаунт','lose');return;}

    var ss=state.upgradeSource;
    var ts=state.upgradeTarget;

    if(!ss.uid){_lg('У предмета нет uid — обнови страницу','lose');return;}

    _BUSY = true;
    _un();
    var b=$('upgradeBtn');
    b.style.pointerEvents='none';
    state.upgrading=true;
    b.disabled=true;

    try {
        var res = await window.apiClient.doUpgrade(ss.uid, ts.id);
        await _pa(res.chance, res.success);

        _sl();

        _xp(20);

        if(res.success){
            _wn(ts.rarity);
            _sr({
                type:'result-win', icon:'🏆', title:'УСПЕХ',
                skin:ts,
                value:'+'+formatRastr(_a1(ts))+' '+_MF_ICON,
                canSell:false
            });
            _lg(ss.name+' -> '+ts.name,'win');
        } else {
            _ls();
            _sr({
                type:'result-lose', icon:'X', title:'ПРОВАЛ',
                skin:null,
                value:'Потеряно: '+formatRastr(_a1(ss))+' '+_MF_ICON,
                canSell:false
            });
            _lg(ss.name+' -> провал','lose');
        }

        var ssIdx = state.inventory.findIndex(function(x){return x.uid === ss.uid;});
        if(ssIdx >= 0) state.inventory.splice(ssIdx, 1);

        if(res.success){
            var newItem = {
                uid: res.item ? res.item.uid : ('u_' + Date.now() + '_' + Math.random().toString(36).slice(2)),
                id: ts.id,
                name: ts.name,
                shortname: ts.shortname,
                svg: ts.svg,
                rarity: ts.rarity,
                price: _a1(ts),
                boughtAt: Date.now()
            };
            state.inventory.push(newItem);
            state.totalWon += _a1(ts);
            state.houseCasinoWon += _a1(ts);
            if(!state.bestUpgrade || _a1(ts) > _a1(state.bestUpgrade)) state.bestUpgrade = ts;
        } else {
            state.totalLost += _a1(ss);
            state.housePlayerLost += _a1(ss);
        }
        state.upgrades++;
        state.profit = state.totalWon - state.totalLost;

        _sortedInvCache = { key: '', data: null };

        _ui(); _rinv(); _ri();

        state.upgradeSource=null;
        state.upgradeTarget=null;
        state.selectedPreset=null;
        state.upgrading=false;
        _tgCache = {};
        b.style.pointerEvents='';
        b.disabled=true;

        _rs1(); _rt1(); _ri(); _rp1();
        _cc(0,'ВЫБЕРИ ПРЕДМЕТ',''); _na(0);

    } catch(e) {
        console.error('upgrade error', e);
        _lg(e.message || 'Ошибка апгрейда','lose');
        state.upgrading=false;
        b.style.pointerEvents='';
        b.disabled=false;
    } finally {
        _BUSY = false;
    }
}

function _ipf(cid,fk,cb){var cn=$(cid);if(!cn)return;var fr=document.createDocumentFragment();var a=document.createElement('button');a.className='upg-inv-filter active';a.textContent='Все';a.dataset.filter='all';fr.appendChild(a);Object.entries(RARITIES).forEach(function(kv){var b=document.createElement('button');b.className='upg-inv-filter';b.textContent=kv[1].name;b.dataset.filter=kv[0];b.style.color=kv[1].color;fr.appendChild(b);});cn.replaceChildren(fr);cn.querySelectorAll('.upg-inv-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();cn.querySelectorAll('.upg-inv-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');state[fk]=b.dataset.filter;cb();});});}
var _sv=20;var _pp=null;var _pq=1;

function _rsh(){
    var g=$('shopGrid');if(!g)return;
    var cacheKey = state.shopFilter + '|' + state.shopSort;
    var sorted;
    if(_sortedShopCache.key === cacheKey && _sortedShopCache.data){
        sorted = _sortedShopCache.data;
    } else {
        var it = state.shopFilter === 'all' ? SKINS : SKINS.filter(function(x){return x.rarity === state.shopFilter;});
        var ro = {common:0, rare:1, legendary:2, mythical:3};
        var arr = it.slice();
        if(state.shopSort === 'price-asc') arr.sort(function(a,b){return _a1(a)-_a1(b);});
        else if(state.shopSort === 'price-desc') arr.sort(function(a,b){return _a1(b)-_a1(a);});
        else if(state.shopSort === 'rarity') arr.sort(function(a,b){return ro[a.rarity]-ro[b.rarity];});
        else if(state.shopSort === 'name') arr.sort(function(a,b){return a.name.localeCompare(b.name);});
        _sortedShopCache = { key: cacheKey, data: arr };
        sorted = arr;
    }
    if(sorted.length===0){g.innerHTML='<div class="empty-inv">Ничего не найдено</div>';return;}
    var v=sorted.slice(0,_sv);var fr=document.createDocumentFragment();
    v.forEach(function(sk){
        var p=_a1(sk);var ca=state.balance>=p;
        var e=document.createElement('div');e.className='shop-item '+sk.rarity;
        e.innerHTML=renderSkinIcon(sk)+'<div class="name">'+sk.name+'</div><div class="rarity-label" style="color:'+RARITIES[sk.rarity].color+'">'+RARITIES[sk.rarity].name+'</div><div class="price-row"><span class="price">'+formatRastr(p)+' '+_MF_ICON+'</span></div><button class="buy-btn" '+(ca?'':'disabled')+'>'+(ca?'КУПИТЬ':'НЕ ХВАТАЕТ')+'</button>';
        e.querySelector('.buy-btn').addEventListener('click',function(ev){
            ev.stopPropagation();
            var freshPrice = _a1(sk);
            if(state.balance < freshPrice){
                _lg('Недостаточно средств','lose');
                _ck();
                return;
            }
            _ob(sk);
        });
        fr.appendChild(e);
    });
    if(sorted.length>_sv){var m=document.createElement('button');m.className='btn-secondary';m.textContent='Показать ещё ('+(sorted.length-_sv)+')';m.style.gridColumn='1/-1';m.style.marginTop='16px';m.addEventListener('click',function(){_sv+=20;_rsh();});fr.appendChild(m);}
    g.replaceChildren(fr);
}

function _ob(sk){
    _un();_ck();

    var freshPrice = _a1(sk);
    _pp = { skin: sk, price: freshPrice };
    _pq = 1;

    $('buyIcon').innerHTML = renderSkinIcon(sk);
    $('buyTitle').textContent = sk.name;
    $('buySub').textContent = RARITIES[sk.rarity].name + ' · Выбери количество:';
    $('buyPrice').innerHTML = formatRastr(freshPrice) + ' ' + _MF_ICON_BIG;

    var inn = $('buyInner');
    if(!inn) return;
    var qr = inn.querySelector('.buy-qty-row');
    if(!qr){
        qr = document.createElement('div');
        qr.className = 'buy-qty-row';
        qr.style.cssText = 'display:flex;gap:8px;justify-content:center;margin:14px 0;flex-wrap:wrap';
        [1,5,10,50].forEach(function(q){
            var b = document.createElement('button');
            b.className = 'btn-secondary';
            b.style.padding = '8px 16px';
            b.textContent = 'x' + q;
            b.dataset.qty = q;
            b.addEventListener('click', function(){
                _pq = q;
                qr.querySelectorAll('button').forEach(function(x){
                    x.style.borderColor = '';
                    x.style.color = '';
                });
                b.style.borderColor = 'var(--accent)';
                b.style.color = 'var(--accent)';
                $('buyPrice').innerHTML = formatRastr(_pp.price * q) + ' ' + _MF_ICON_BIG;
                _ck();
            });
            qr.appendChild(b);
        });
        var ac = inn.querySelector('.buy-actions');
        if(ac) inn.insertBefore(qr, ac);
        else inn.appendChild(qr);
    }
    qr.querySelectorAll('button').forEach(function(x){
        x.style.borderColor = '';
        x.style.color = '';
    });
    var fb = qr.querySelector('button[data-qty="1"]');
    if(fb){
        fb.style.borderColor = 'var(--accent)';
        fb.style.color = 'var(--accent)';
    }
    $('buyModal').classList.add('show');
}

var _ivf='all';

function _rinv(){
    var iv=$('inventory');
    if(!iv)return;
    if(state.inventory.length===0){iv.innerHTML='<div class="empty-inv">Инвентарь пуст</div>';return;}
    var cacheKey = _ivf + '|' + state.inventory.length;
    var sorted;
    if(_sortedInvCache.key === cacheKey && _sortedInvCache.data){
        sorted = _sortedInvCache.data;
    } else {
        var sr = state.inventory.slice().sort(function(a,b){return _a1(b)-_a1(a);});
        if(_ivf!=='all')sr=sr.filter(function(x){return x.rarity===_ivf;});
        _sortedInvCache = { key: cacheKey, data: sr };
        sorted = sr;
    }
    if(sorted.length===0){iv.innerHTML='<div class="empty-inv">Ничего не найдено</div>';return;}
    var fr=document.createDocumentFragment();
    sorted.forEach(function(sk){
        var e=document.createElement('div');e.className='inv-item '+sk.rarity;
        e.innerHTML=renderSkinIcon(sk)+'<div class="name">'+sk.name+'</div><div class="price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div><button class="sell-btn">Продать</button>';
        e.querySelector('.sell-btn').addEventListener('click',function(ev){ev.stopPropagation();_ssk(sk);});
        fr.appendChild(e);
    });
    iv.replaceChildren(fr);
}

async function _ssk(sk){
    if(_BUSY) return;
    if(!_CU){_lg('Войди в аккаунт','lose');return;}
    if(!sk || !sk.uid){_lg('У этого предмета нет uid — обнови страницу','lose');return;}
    _BUSY = true;
    _ck();
    try {
        var res = await window.apiClient.sellItem(sk.uid);
        _lg('Продано: '+sk.name+' +'+formatRastr(res.sold||sk.price),'info');

        var idx = state.inventory.findIndex(function(x){return x.uid === sk.uid;});
        if(idx >= 0) state.inventory.splice(idx, 1);
        state.balance += (res.sold || sk.price);
        state.totalSold += (res.sold || sk.price);

        _sortedInvCache = { key: '', data: null };

        _ui(); _rinv(); _ri();
    } catch(e) {
        _lg(e.message || 'Ошибка продажи','lose');
    } finally {
        _BUSY = false;
    }
}

function _ra(){_rs1();_rt1();_rp1();_ri();_rt2();_rsh();_ui();_rinv();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);_usb();}
function _usb(){var s=$('speedSlowBtn');var f=$('speedFastBtn');if(!s||!f)return;if(state.spinSpeed==='fast'){s.classList.remove('active');f.classList.add('active');}else{s.classList.add('active');f.classList.remove('active');}}
   function _ah(){
    var lb=$('logoBtn');
    if(lb) lb.addEventListener('click', function(e){
        e.preventDefault();
        _ck();
        document.querySelectorAll('.nav-tab').forEach(function(x){ x.classList.remove('active'); });
        document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
        var upTab = document.querySelector('.nav-tab[data-page="upgrade"]');
        if(upTab) upTab.classList.add('active');
        var upPage = $('page-upgrade');
        if(upPage) upPage.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        _sl();
    });

    var ub=$('userBadge');if(ub)ub.addEventListener('click',function(){if(_CU)_ol();else _oa();});
    var lc=$('logoutConfirm');if(lc)lc.addEventListener('click',_lo);
    var lx=$('logoutCancel');if(lx)lx.addEventListener('click',function(){_ck();_cl();});
    var ss=$('speedSlowBtn');if(ss)ss.addEventListener('click',function(){_un();_ck();state.spinSpeed='slow';_usb();save();});
    var sf=$('speedFastBtn');if(sf)sf.addEventListener('click',function(){_un();_ck();state.spinSpeed='fast';_usb();save();});
    var rc=$('resultContinue');if(rc)rc.addEventListener('click',_cr);
    var sb=$('soundBtn');if(sb)sb.addEventListener('click',function(){state.soundOn=!state.soundOn;$('soundIcon').textContent=state.soundOn?'S':'M';if(state.soundOn){_un();_ck();}save();});

    var bcf=$('buyConfirm');
    if(bcf)bcf.addEventListener('click',async function(){
        if(_BUSY) return;
        if(!_pp)return;
        var sk=_pp.skin;
        var q=_pq||1;
        _ck();

        if(!_CU){_lg('Войди в аккаунт','lose');return;}

        _BUSY = true;
        bcf.disabled = true;
        bcf.textContent = '...';

        try {
            var unitPrice = _pp.price;
            var totalSpent = 0;
            var addedItems = [];

            for(var i=0;i<q;i++){
                var r = await window.apiClient.buyItem(sk.id);
                if(r && r.item) addedItems.push(r.item);
                totalSpent += unitPrice;
            }

            _by();
            _lg('Куплено: '+sk.name+' x'+q,'win');

            state.balance -= totalSpent;
            state.totalLost += totalSpent;
            state.purchases += q;
            state.profit = state.totalWon - state.totalLost;
            for(var j=0;j<addedItems.length;j++) state.inventory.push(addedItems[j]);

            _sortedInvCache = { key: '', data: null };

            _ui(); _rinv(); _ri();

            $('buyModal').classList.remove('show');
            _pp=null; _pq=1;
        } catch(e) {
            _lg(e.message || 'Ошибка покупки','lose');
            console.error('buy error', e);
        } finally {
            _BUSY = false;
            bcf.disabled = false;
            bcf.textContent = 'КУПИТЬ';
        }
    });

    var bc=$('buyCancel');if(bc)bc.addEventListener('click',function(){_ck();$('buyModal').classList.remove('show');_pp=null;_pq=1;});

    var sa=$('sellAllBtn');
    if(sa)sa.addEventListener('click',async function(){
        if(_BUSY) return;
        if(state.inventory.length===0)return;
        if(!_CU){_lg('Войди в аккаунт','lose');return;}
        if(!confirm('Продать всё?'))return;
        _ck();

        _BUSY = true;
        sa.disabled = true;

        try {
            var res = await window.apiClient.sellAllItems();
            _by();
            _lg('Продано всё: +'+formatRastr(res.total||0),'win');

            state.balance += (res.total || 0);
            state.totalSold += (res.total || 0);
            state.inventory = [];

            _sortedInvCache = { key: '', data: null };

            _ui(); _rinv(); _ri();
        } catch(e) {
            _lg(e.message || 'Ошибка продажи','lose');
        } finally {
            _BUSY = false;
            sa.disabled = false;
        }
    });

    var ub2=$('upgradeBtn');if(ub2)ub2.addEventListener('click',_hu);
    var ss2=$('sourceSlot');if(ss2)ss2.addEventListener('click',function(){if(state.upgradeSource)return;_un();_ck();var p=document.querySelector('.upg-inv-panel');if(p)p.scrollIntoView({behavior:'smooth',block:'center'});});
    var ts2=$('targetSlot');if(ts2)ts2.addEventListener('click',function(){if(state.upgradeTarget)return;_un();_ck();var p=document.querySelector('.upg-items-panel');if(p)p.scrollIntoView({behavior:'smooth',block:'center'});});
    var sr=$('sourceRemoveBtn');if(sr)sr.addEventListener('click',function(e){e.stopPropagation();_un();_ck();_rz();});
    var tr=$('targetRemoveBtn');if(tr)tr.addEventListener('click',function(e){e.stopPropagation();_un();_ck();state.upgradeTarget=null;state.selectedPreset=null;_tgCache={};_rt1();_rp1();_uc();});
    var is=$('invSearch');if(is)is.addEventListener('input',_ri);
    var its=$('itemsSearch');if(its)its.addEventListener('input',_rt2);
    var so=$('shopSort');if(so)so.addEventListener('change',function(e){state.shopSort=e.target.value;_sv=20;_rsh();save();_ck();});
    document.querySelectorAll('.shop-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();document.querySelectorAll('.shop-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');state.shopFilter=b.dataset.rarity;_sv=20;_rsh();save();});});
    document.querySelectorAll('.inv-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();document.querySelectorAll('.inv-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');_ivf=b.dataset.rarity;_sortedInvCache={key:'',data:null};_rinv();});});
    document.querySelectorAll('.nav-tab').forEach(function(t){t.addEventListener('click',function(){_un();_ck();_sl();document.querySelectorAll('.nav-tab').forEach(function(x){x.classList.remove('active');});document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});t.classList.add('active');$('page-'+t.dataset.page).classList.add('active');if(t.dataset.page==='shop'){_sv=20;_rsh();}if(t.dataset.page==='inventory')_rinv();if(t.dataset.page==='upgrade'){_ri();_rt2();}});});
    document.addEventListener('visibilitychange',function(){if(document.hidden)_sl();});
    document.body.addEventListener('click',function(){_un();},{once:true});

    var stb=$('steamLoginBtn');if(stb)stb.addEventListener('click',function(){window.location.href=window.apiClient.getSteamAuthUrl();});
}

function _checkSteamToken(){
    var p = new URLSearchParams(window.location.search);
    var t = p.get('token');
    if(!t) return false;
    window.history.replaceState({}, document.title, window.location.pathname);

    if(window.fbSignInWithCustomToken && window.fbAuth){
        window.fbSignInWithCustomToken(window.fbAuth, t)
            .then(async function(c){
                console.log('Steam OK', c.user.uid);
                try {
                    var idToken = await c.user.getIdToken();
                    if(window.apiClient) window.apiClient.setAuthToken(idToken);
                } catch(e) { console.error('setAuthToken err', e); }
            })
            .catch(function(e){
                console.error('Steam err', e.message);
                alert('Ошибка входа: ' + e.message);
            });
        return true;
    }
    return false;
}

function _waitForFirebase(cb,attempts){
    attempts=attempts||0;
    if(window.fbReady&&window.fbSignInWithCustomToken){cb();return;}
    if(attempts>50){console.error('Firebase timeout');return;}
    setTimeout(function(){_waitForFirebase(cb,attempts+1);},100);
}

function _init(){
    _pl();
    _ipf('invPanelFilters','invPanelFilter',_ri);
    _ipf('itemsPanelFilters','itemsPanelFilter',_rt2);
    var sf=document.querySelector('.shop-filter[data-rarity="'+state.shopFilter+'"]');
    if(sf){document.querySelectorAll('.shop-filter').forEach(function(b){b.classList.remove('active');});sf.classList.add('active');}
    if($('shopSort'))$('shopSort').value=state.shopSort;
    if($('soundIcon'))$('soundIcon').textContent=state.soundOn?'S':'M';
    _ah();
    _fb();
    loadPricesFromFirestore();
}

window.state=state;
window.save=save;
window.log=_lg;
window.renderAll=_ra;
window.updateUI=_ui;
window.resetStateToDefault=_rs;
window.formatRastr=formatRastr;
window.START_BALANCE=START_BALANCE;
window.SKINS=SKINS;
window.RARITIES=RARITIES;
window.renderSkinIcon=renderSkinIcon;
window.currentUser=function(){return _CU;};

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){
        _init();
        _waitForFirebase(function(){_checkSteamToken();});
    });
}else{
    _init();
    _waitForFirebase(function(){_checkSteamToken();});
}
})();
