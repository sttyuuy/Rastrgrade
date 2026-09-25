(function(){
'use strict';

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

function _buildIndexes(){
    window._skinsByName = {};
    window._skinsById = {};
    if(window.SKINS){
        window.SKINS.forEach(function(s){
            window._skinsByName[_norm(s.name)] = s;
            window._skinsById[s.id] = s;
        });
    }
}
_buildIndexes();

async function loadPricesFromApi(){
    if(!window.apiClient || !window.apiClient.getPrices) return;
    try {
        var map = await window.apiClient.getPrices();
        _firestorePrices = map || {};
        _clearCaches();
        console.log('✅ Загружено цен з API:', Object.keys(_firestorePrices).length);
        if(typeof _rsh === 'function') _rsh();
        if(typeof _rinv === 'function') _rinv();
        if(typeof _ri === 'function') _ri();
        if(typeof _rt2 === 'function') _rt2();
        if(typeof _ui === 'function') _ui();
        if(typeof _pr === 'function') _pr();
    } catch(e) {
        console.warn('Не вдалось завантажити ціни з API:', e.message);
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
            _ca();_rs();await _lc();_ra();_ub();_pr();
            _lg('Добро пожаловать!','win');
        }else{
            _CU=null;_UDN='';_UPA='';
            _clearCaches();
            if(window.apiClient) window.apiClient.clearAuthToken();
            _rs();_ra();_ub();_oa();_pr();
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

function _mapInv(list){
    return (list || []).map(function(i){
        if(!i.svg && window._skinsById[i.id]) i.svg = window._skinsById[i.id].svg;
        return i;
    });
}

async function _lc(){
    if(!_CU) return;
    var d = null;
    try{ d = await window.apiClient.getUserData(); }
    catch(e){ console.warn('[lc] API недоступний:', e.message); }
    if(d){
        state.balance = d.balance || 0;
        state.inventory = _mapInv(d.inventory);
        state.totalWon = d.totalWon || 0;
        state.totalLost = d.totalLost || 0;
        state.totalSold = d.totalSold || 0;
        state.profit = Math.round((state.totalWon - state.totalLost) * 100) / 100;
        state.upgrades = d.upgrades || 0;
        state.purchases = d.purchases || 0;
        state.housePlayerLost = d.housePlayerLost || 0;
        state.houseCasinoWon = d.houseCasinoWon || 0;
        state.bestDrop = d.bestDrop ? (window._skinsById[d.bestDrop.id] || d.bestDrop) : null;
        state.bestUpgrade = d.bestUpgrade ? (window._skinsById[d.bestUpgrade.id] || d.bestUpgrade) : null;
        state.xp = d.xp || 0;
        state.level = d.level || 1;
        if(d.displayName) _UDN = d.displayName;
        if(d.photoURL) _UPA = d.photoURL;
    } else {
        state.balance = START_BALANCE;
    }
    if(!_UDN && _CU.displayName) _UDN = _CU.displayName;
    if(!_UPA && _CU.photoURL) _UPA = _CU.photoURL;
    _sortedInvCache = { key: '', data: null };
    try {
        var ui = JSON.parse(localStorage.getItem('rustup_ui') || '{}');
        if(ui.soundOn !== undefined) state.soundOn = ui.soundOn;
        if(ui.shopFilter) state.shopFilter = ui.shopFilter;
        if(ui.shopSort) state.shopSort = ui.shopSort;
        if(ui.spinSpeed) state.spinSpeed = ui.spinSpeed;
    } catch(e){}
}

function save(){
    if(!_CU) return;
    if(_SAVE_TIMER) clearTimeout(_SAVE_TIMER);
    _SAVE_TIMER = setTimeout(function(){
        try {
            localStorage.setItem('rustup_ui', JSON.stringify({
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
        b.title='Профиль';
        if(_UPA){i.innerHTML='<img src="'+_UPA+'" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';}
        else{i.textContent='X';}
    }else{b.title='Войти';i.textContent='?';}
}
function _oa(){var m=document.getElementById('authModal');if(m)m.classList.add('show');}
function _ca(){var m=document.getElementById('authModal');if(m)m.classList.remove('show');}

var state={
    balance:0,inventory:[],profit:0,
    totalWon:0,totalLost:0,totalSold:0,upgrades:0,purchases:0,
    bestDrop:null,bestUpgrade:null,
    upgradeSource:null,
    upgradeSource2:null,
    upgradeTarget:null,selectedPreset:null,
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
    state.upgradeSource=null;state.upgradeSource2=null;state.upgradeTarget=null;state.selectedPreset=null;
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
    } else { c.loop = true; }
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
        if(_LP[k]){ try{_LP[k].pause();_LP[k].currentTime=0;}catch(e){} _LP[k]=null; }
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

function _sourceTotal(){
    var total = 0;
    if(state.upgradeSource) total += _a1(state.upgradeSource);
    if(state.upgradeSource2) total += _a1(state.upgradeSource2);
    return total;
}

function _isSameItem(){
    return state.upgradeSource && state.upgradeSource2 && state.upgradeSource.uid === state.upgradeSource2.uid;
}

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

function _rz(){
    state.upgradeSource=null;
    state.upgradeSource2=null;
    state.upgradeTarget=null;
    state.selectedPreset=null;
    _rs1();_rs2();_rt1();_rp1();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);
    if(DOM.upgradeBtn)DOM.upgradeBtn.disabled=true;
}

var DOM={};
function _cd(){
    ['balance','profit','invCount','invValue','levelBadge','levelName','levelBarFill',
     'sourcePriceLabel','targetPriceLabel',
     'sourceSlot1','sourceSlot2','addSecondBtn','sourceRemoveBtn',
     'targetSlot','targetRemoveBtn',
     'circlePercent','circleStatus','presetContainer',
     'invPanelCount','invPanelList','targetsCount','itemsPanelGrid',
     'invSearch','itemsSearch','upgradeBtn','speedSlowBtn','speedFastBtn','userBadge'
    ].forEach(function(i){DOM[i]=$(i);});
    DOM.shopBalance=$('shopBalance');
}
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

/* ============================================================
   КОЛЕСО — дуга росте знизу, поділки, червона зона знизу
   ============================================================ */
var _RING_R = 130;
var _RING_CX = 150;
var _RING_CY = 150;
var _RING_CIRC = 2 * Math.PI * _RING_R;

/* Малюємо 72 поділки (кожні 5%) */
function _buildTicks(){
    var g = document.getElementById('ringTicks');
    if(!g) return;
    var html = '';
    for(var i = 0; i < 72; i++){
        var angle = (i / 72) * 360 - 90; // 0° — вгорі
        var rad = angle * Math.PI / 180;
        var r1 = _RING_R - 14;
        var r2 = _RING_R + 14;
        var x1 = _RING_CX + Math.cos(rad) * r1;
        var y1 = _RING_CY + Math.sin(rad) * r1;
        var x2 = _RING_CX + Math.cos(rad) * r2;
        var y2 = _RING_CY + Math.sin(rad) * r2;
        var isMajor = (i % 2 === 0); // кожна 10% — товща
        var sw = isMajor ? 2 : 1;
        var op = isMajor ? 0.5 : 0.2;
        html += '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="#4a4a5e" stroke-width="'+sw+'" stroke-opacity="'+op+'"/>';
    }
    g.innerHTML = html;
}

/* Малюємо червону зону виграшу знизу (від 170° до 190° — ширина 20°) */
function _buildWinZone(chancePct){
    var el = document.getElementById('winZone');
    if(!el) return;
    // Зона виграшу залежить від шансу — чим менше шанс, тим вужча зона
    // Але мінімум 5° для видимості
    var halfWidth = Math.max(5, Math.min(90, chancePct * 1.8));
    // Знизу = 180°. Малюємо сектор від (180 - halfWidth) до (180 + halfWidth)
    var startAngle = 180 - halfWidth;
    var endAngle = 180 + halfWidth;

    var startRad = startAngle * Math.PI / 180;
    var endRad = endAngle * Math.PI / 180;
    var rOuter = _RING_R + 10;
    var rInner = _RING_R - 10;

    var x1 = _RING_CX + Math.cos(startRad) * rOuter;
    var y1 = _RING_CY + Math.sin(startRad) * rOuter;
    var x2 = _RING_CX + Math.cos(endRad) * rOuter;
    var y2 = _RING_CY + Math.sin(endRad) * rOuter;
    var x3 = _RING_CX + Math.cos(endRad) * rInner;
    var y3 = _RING_CY + Math.sin(endRad) * rInner;
    var x4 = _RING_CX + Math.cos(startRad) * rInner;
    var y4 = _RING_CY + Math.sin(startRad) * rInner;

    var largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
    var d = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1)
          + ' A ' + rOuter + ' ' + rOuter + ' 0 ' + largeArc + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1)
          + ' L ' + x3.toFixed(1) + ' ' + y3.toFixed(1)
          + ' A ' + rInner + ' ' + rInner + ' 0 ' + largeArc + ' 0 ' + x4.toFixed(1) + ' ' + y4.toFixed(1)
          + ' Z';
    el.setAttribute('d', d);
}

function _dc(c){
    c = Math.max(0, Math.min(100, c));
    var el = $('chanceSector');
    if(!el) return;
    // Дуга росте знизу (6:00) в обидва боки
    el.style.strokeDasharray = c + ' ' + (100 - c);
    el.style.strokeDashoffset = (c / 2);
    el.style.opacity = c <= 0 ? '0' : '1';
    // Оновлюємо зону виграшу
    _buildWinZone(c);
}

function _na(d){
    if(!_ndl) _ndl = $('circleNeedle');
    _needleAngle = d;
    if(_ndl) _ndl.style.transform = 'rotate(' + d + 'deg) translateZ(0)';
}

function _cc(c,t,k){
    _dc(c);
    $('circlePercent').textContent=Math.round(c)+'%';
    var s=$('circleStatus');s.textContent=t||'';s.className='upg-status '+(k||'');
    var co;if(c>=65)co='#7ed321';else if(c>=35)co='#f5c542';else if(c>=15)co='#ff6b1a';else co='#ff3b3b';
    $('circlePercent').style.color=co;
}

function _rs1(){
    var s=$('sourceSlot1');if(!s)return;
    if(state.upgradeSource){
        s.className='upg-item-slot filled '+state.upgradeSource.rarity;
        s.innerHTML=renderSkinIcon(state.upgradeSource)
            +'<div class="upg-item-name">'+state.upgradeSource.name+'</div>'
            +'<div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeSource.rarity].color+'">'+RARITIES[state.upgradeSource.rarity].name+'</div>';
    }else{
        s.className='upg-item-slot';
        s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Выбрать предмет</div></div>';
    }
    _updateSourceLabels();
}

function _rs2(){
    var s=$('sourceSlot2');if(!s)return;
    var addBtn=$('addSecondBtn');
    if(state.upgradeSource2){
        s.style.display='';
        s.className='upg-item-slot filled '+state.upgradeSource2.rarity;
        s.innerHTML=renderSkinIcon(state.upgradeSource2)
            +'<div class="upg-item-name">'+state.upgradeSource2.name+'</div>'
            +'<div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeSource2.rarity].color+'">'+RARITIES[state.upgradeSource2.rarity].name+'</div>';
        if(addBtn) addBtn.style.display='none';
    }else{
        s.style.display='none';
        s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Второй предмет</div></div>';
        if(addBtn){
            if(state.upgradeSource) addBtn.style.display='block';
            else addBtn.style.display='none';
        }
    }
    _updateSourceLabels();
}

function _updateSourceLabels(){
    var lbl = $('sourcePriceLabel');
    if(!lbl) return;
    if(!state.upgradeSource){ lbl.textContent='—'; return; }
    var total = _sourceTotal();
    var html = formatRastr(total)+' '+_MF_ICON;
    if(state.upgradeSource2){
        html += ' <span style="font-size:.7rem;color:#888">(2 шт.)</span>';
    }
    lbl.innerHTML = html;
    var rm = $('sourceRemoveBtn');
    if(rm){
        if(state.upgradeSource) rm.style.display='block';
        else rm.style.display='none';
    }
}

function _rt1(){
    var s=$('targetSlot');if(!s)return;
    if(state.upgradeTarget){
        s.className='upg-item-slot filled '+state.upgradeTarget.rarity;
        s.innerHTML=renderSkinIcon(state.upgradeTarget)
            +'<div class="upg-item-name">'+state.upgradeTarget.name+'</div>'
            +'<div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeTarget.rarity].color+'">'+RARITIES[state.upgradeTarget.rarity].name+'</div>';
        $('targetPriceLabel').innerHTML=formatRastr(_a1(state.upgradeTarget))+' '+_MF_ICON;
        $('targetRemoveBtn').style.display='block';
    }else{
        s.className='upg-item-slot';
        s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">?</div><div class="upg-item-empty-text">Цель</div></div>';
        $('targetPriceLabel').textContent='—';
        $('targetRemoveBtn').style.display='none';
    }
}

function _uc(){
    if(!state.upgradeSource||!state.upgradeTarget){
        _cc(0,'ВЫБЕРИ ПРЕДМЕТ','');
        _na(0);
        DOM.upgradeBtn.disabled=true;
        return;
    }
    if(_isSameItem()){
        _cc(0,'ДВА ОДИНАКОВЫХ','lose');
        _na(0);
        DOM.upgradeBtn.disabled=true;
        return;
    }
    var c=_ch(_sourceTotal(),_a1(state.upgradeTarget));
    state.upgradeTarget._realChance=c;
    var s,sc;
    if(c>=60){s='ВЫСОКИЙ ШАНС';sc='win';}
    else if(c>=30){s='СРЕДНИЙ ШАНС';sc='';}
    else if(c>=10){s='РИСК';sc='';}
    else if(c>=1){s='ХАЙ РИСК';sc='lose';}
    else{s='ПОЧТИ НЕВОЗМОЖНО';sc='lose';}
    _cc(c,s,sc);
    _na(0);
    DOM.upgradeBtn.disabled=false;
}

function _rp1(){
    var cn=$('presetContainer');if(!cn)return;
    var f=document.createDocumentFragment();
    var hs=!!state.upgradeSource;
    _P.forEach(function(p,i){
        var b=document.createElement('button');
        b.className='upg-preset-btn';
        b.disabled=!hs;
        b.dataset.idx=i;
        var dt='—';
        if(hs){
            var sp=_sourceTotal();
            var tp=sp*p.mult;
            var t=_tg(tp,state.upgradeSource);
            if(t&&_a1(t)>sp){
                var rc=_ch(sp,_a1(t));
                if(rc>=10)dt=Math.round(rc)+'%';
                else dt=rc.toFixed(2)+'%';
            }
        }
        b.innerHTML='<span class="upg-preset-mult">'+p.label+'</span><span class="upg-preset-chance">'+dt+'</span>';
        if(state.selectedPreset===i)b.classList.add('active');
        b.addEventListener('click',function(e){e.stopPropagation();_sp2(i);});
        f.appendChild(b);
    });
    cn.replaceChildren(f);
}

function _sp2(i){
    if(_BUSY || state.upgrading) return;
    if(!state.upgradeSource){_lg('Сначала выбери предмет','lose');_ck();return;}
    if(_isSameItem()){_lg('Два одинаковых предмета нельзя','lose');_ck();return;}
    _un();_ck();
    var sp=_sourceTotal();
    if(sp>=_MX*0.99){_lg('Это максимальный скин','lose');return;}
    var p=_P[i];
    var tp=sp*p.mult;
    var t=_tg(tp,state.upgradeSource);
    if(!t||_a1(t)<=sp){_lg('Нет подходящей цели','lose');return;}
    if(_a1(t)>_MX){_lg('Нет цели','lose');return;}
    state.upgradeTarget=t;
    state.selectedPreset=i;
    state.upgradeTarget._realChance=_ch(sp,_a1(t));
    _rt1();_rp1();_uc();
}

function _ri(){
    var l=$('invPanelList');if(!l)return;
    var f=state.invPanelFilter;
    var s=($('invSearch').value||'').toLowerCase();
    var sr=state.inventory.slice().sort(function(a,b){return _a1(b)-_a1(a);});
    if(f!=='all')sr=sr.filter(function(x){return x.rarity===f;});
    if(s)sr=sr.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});
    $('invPanelCount').textContent=state.inventory.length+' шт.';
    if(sr.length===0){l.innerHTML='<div class="upg-inv-empty">Инвентарь пуст</div>';return;}
    var fr=document.createDocumentFragment();
    sr.forEach(function(sk){
        var e=document.createElement('div');
        e.className='upg-inv-item '+sk.rarity;
        var isSource1 = state.upgradeSource && state.upgradeSource.uid === sk.uid;
        var isSource2 = state.upgradeSource2 && state.upgradeSource2.uid === sk.uid;
        if(isSource1 || isSource2) e.classList.add('used');
        if(_BUSY || state.upgrading) e.classList.add('blocked');
        var badge = '';
        if(isSource1) badge = '<div class="upg-inv-badge">1</div>';
        else if(isSource2) badge = '<div class="upg-inv-badge">2</div>';
        e.innerHTML = badge + renderSkinIcon(sk)
            + '<div class="upg-inv-name">'+sk.name+'</div>'
            + '<div class="upg-inv-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';
        e.addEventListener('click',function(){
            if(_BUSY || state.upgrading) return;
            _un();_ck();
            if(isSource1){
                state.upgradeSource = state.upgradeSource2 || null;
                state.upgradeSource2 = null;
            } else if(isSource2){
                state.upgradeSource2 = null;
            } else if(!state.upgradeSource){
                state.upgradeSource = sk;
            } else if(!state.upgradeSource2){
                state.upgradeSource2 = sk;
            } else {
                state.upgradeSource = sk;
            }
            state.upgradeTarget = null;
            state.selectedPreset = null;
            _tgCache={};
            _rs1();_rs2();_rt1();_ri();_rp1();_uc();
        });
        fr.appendChild(e);
    });
    l.replaceChildren(fr);
}

function _rt2(){
    var g=$('itemsPanelGrid');if(!g)return;
    var f=state.itemsPanelFilter;
    var s=($('itemsSearch').value||'').toLowerCase();
    var it=SKINS.slice();
    if(f!=='all')it=it.filter(function(x){return x.rarity===f;});
    if(s)it=it.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});
    $('targetsCount').textContent=it.length;
    if(it.length===0){g.innerHTML='<div class="upg-inv-empty" style="grid-column:1/-1">Ничего не найдено</div>';return;}
    var fr=document.createDocumentFragment();
    it.forEach(function(sk){
        var e=document.createElement('div');
        e.className='upg-target-item '+sk.rarity;
        if(state.upgradeTarget&&state.upgradeTarget.id===sk.id){
            e.style.borderColor='#f5c542';
            e.style.boxShadow='0 0 20px rgba(245,197,66,0.5)';
        }
        if(_BUSY || state.upgrading) e.classList.add('blocked');
        e.innerHTML=renderSkinIcon(sk)
            + '<div class="upg-target-name">'+sk.name+'</div>'
            + '<div class="upg-target-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';
        e.addEventListener('click',function(){
            if(_BUSY || state.upgrading) return;
            if(!state.upgradeSource){_lg('Сначала выбери свой предмет','lose');_ck();return;}
            if(_isSameItem()){_lg('Два одинаковых предмета нельзя','lose');_ck();return;}
            if(sk.id===state.upgradeSource.id || (state.upgradeSource2 && sk.id===state.upgradeSource2.id)){
                _lg('Нельзя апгрейдить в себя','lose');_ck();return;
            }
            var srcTotal = _sourceTotal();
            if(_a1(sk)<=srcTotal){_lg('Цель должна быть дороже','lose');_ck();return;}
            if(_a1(sk)>_MX){_lg('Нет цели','lose');_ck();return;}
            _un();_ck();
            state.upgradeTarget=sk;
            state.selectedPreset=null;
            state.upgradeTarget._realChance=_ch(srcTotal,_a1(sk));
            _rt1();_rp1();_uc();
        });
        fr.appendChild(e);
    });
    g.replaceChildren(fr);
}

/* ============================================================
   _pa — СТРІЛКА. ВИГРАШ = ВГОРУ, ПРОГРАШ = ВНИЗ
   ============================================================ */
var _paRAF = null;
function _pa(c, w){
    return new Promise(function(res){
        if(_paRAF){ cancelAnimationFrame(_paRAF); _paRAF = null; }
        var d = state.spinSpeed === 'fast' ? 2600 : 4800;

        // Знизу = 180°. Зона виграшу — знизу.
        // half — пів-ширина зони виграшу в градусах
        var half = Math.max(5, Math.min(90, c * 1.8));
        var fa;
        if(w){
            // ВИГРАШ — падає в зону знизу (навколо 180°)
            var g1 = Math.min(3, half * 0.3);
            fa = 180 + (Math.random() * 2 - 1) * (half - g1);
        } else {
            // ПРОГРАШ — падає ПОЗА зоною знизу (все, крім 180° ± half)
            // Розділяємо на дві зони: верхня (0° ± (180-half)) і залишок
            var upperHalf = 180 - half; // від 0° до 180° половина
            var g2 = Math.min(3, upperHalf * 0.2);
            // Кидаємо у верхню зону (0° ± upperHalf) з відступом від межі
            fa = 0 + (Math.random() * 2 - 1) * (upperHalf - g2);
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
        function easeOutQuint(t){ return 1 - Math.pow(1 - t, 5); }
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
            if(t < 1){ _paRAF = requestAnimationFrame(an); }
            else {
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

async function _hu(){
    if(_BUSY) return;
    if(!state.upgradeSource||!state.upgradeTarget)return;
    if(state.upgrading)return;
    if(!_CU){_lg('Войди в аккаунт','lose');return;}
    if(_isSameItem()){_lg('Два одинаковых предмета нельзя','lose');return;}
    var ss = state.upgradeSource;
    var ss2 = state.upgradeSource2;
    var ts = state.upgradeTarget;
    if(!ss.uid){_lg('У предмета нет uid — обнови страницу','lose');return;}
    if(ss2 && !ss2.uid){_lg('У второго предмета нет uid — обнови страницу','lose');return;}

    var uids = [ss.uid];
    if(ss2) uids.push(ss2.uid);

    _BUSY = true;
    _un();
    var b=$('upgradeBtn');
    b.style.pointerEvents='none';
    state.upgrading=true;
    b.disabled=true;

    document.querySelectorAll('.upg-inv-item, .upg-target-item, .upg-preset-btn, .upg-btn-remove').forEach(function(el){
        el.classList.add('blocked');
    });

    try {
        var res = await window.apiClient.doUpgrade(uids, ts.id);
        await _pa(res.chance, res.success);
        _sl();
        _xp(20);

        if(res.success){
            _wn(ts.rarity);
            _sr({ type:'result-win', icon:'🏆', title:'УСПЕХ', skin:ts, value:'+'+formatRastr(_a1(ts))+' '+_MF_ICON, canSell:false });
            _lg(ss.name+(ss2?' + '+ss2.name:'')+' -> '+ts.name,'win');
        } else {
            _ls();
            _sr({ type:'result-lose', icon:'X', title:'ПРОВАЛ', skin:null, value:'Потеряно: '+formatRastr(_sourceTotal())+' '+_MF_ICON, canSell:false });
            _lg(ss.name+(ss2?' + '+ss2.name:'')+' -> провал','lose');
        }

        state.inventory = state.inventory.filter(function(x){
            return x.uid !== ss.uid && (!ss2 || x.uid !== ss2.uid);
        });

        if(res.success){
            var newItem = {
                uid: res.item ? res.item.uid : ('u_' + Date.now() + '_' + Math.random().toString(36).slice(2)),
                id: ts.id, name: ts.name, shortname: ts.shortname, svg: ts.svg,
                rarity: ts.rarity, price: _a1(ts), boughtAt: Date.now()
            };
            state.inventory.push(newItem);
            state.totalWon += _a1(ts);
            state.houseCasinoWon += _a1(ts);
            if(!state.bestUpgrade || _a1(ts) > _a1(state.bestUpgrade)) state.bestUpgrade = ts;
            if(!state.bestDrop || _a1(ts) > _a1(state.bestDrop)) state.bestDrop = ts;
        } else {
            var lostTotal = _sourceTotal();
            state.totalLost += lostTotal;
            state.housePlayerLost += lostTotal;
        }

        state.upgrades++;
        state.profit = Math.round((state.totalWon - state.totalLost) * 100) / 100;
        _sortedInvCache = { key: '', data: null };

        _ui(); _rinv(); _ri(); _pr();

        state.upgradeSource=null;
        state.upgradeSource2=null;
        state.upgradeTarget=null;
        state.selectedPreset=null;
        state.upgrading=false;
        _tgCache = {};
        b.style.pointerEvents='';
        b.disabled=true;
        _rs1();_rs2();_rt1();_ri();_rp1();
        _cc(0,'ВЫБЕРИ ПРЕДМЕТ',''); _na(0);
    } catch(e) {
        console.error('upgrade error', e);
        _lg(e.message || 'Ошибка апгрейда','lose');
        state.upgrading=false;
        b.style.pointerEvents='';
        b.disabled=false;
    } finally {
        _BUSY = false;
        document.querySelectorAll('.upg-inv-item, .upg-target-item, .upg-preset-btn, .upg-btn-remove').forEach(function(el){
            el.classList.remove('blocked');
        });
    }
}

function _ipf(cid,fk,cb){
    var cn=$(cid);if(!cn)return;
    var fr=document.createDocumentFragment();
    var a=document.createElement('button');
    a.className='upg-inv-filter active';a.textContent='Все';a.dataset.filter='all';
    fr.appendChild(a);
    Object.entries(RARITIES).forEach(function(kv){
        var b=document.createElement('button');
        b.className='upg-inv-filter';b.textContent=kv[1].name;b.dataset.filter=kv[0];
        b.style.color=kv[1].color;fr.appendChild(b);
    });
    cn.replaceChildren(fr);
    cn.querySelectorAll('.upg-inv-filter').forEach(function(b){
        b.addEventListener('click',function(){
            _un();_ck();
            cn.querySelectorAll('.upg-inv-filter').forEach(function(x){x.classList.remove('active');});
            b.classList.add('active');
            state[fk]=b.dataset.filter;cb();
        });
    });
}
var _sv=20;var _pp=null;var _pq=1;

function _rsh(){
    var g=$('shopGrid');if(!g)return;
    var cacheKey = state.shopFilter + '|' + state.shopSort;
    var sorted;
    if(_sortedShopCache.key === cacheKey && _sortedShopCache.data){ sorted = _sortedShopCache.data; }
    else {
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
            if(state.balance < freshPrice){ _lg('Недостаточно средств','lose'); _ck(); return; }
            _ob(sk);
        });
        fr.appendChild(e);
    });
    if(sorted.length>_sv){
        var m=document.createElement('button');
        m.className='btn-secondary';m.textContent='Показать ещё ('+(sorted.length-_sv)+')';
        m.style.gridColumn='1/-1';m.style.marginTop='16px';
        m.addEventListener('click',function(){_sv+=20;_rsh();});
        fr.appendChild(m);
    }
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
            b.className = 'btn-secondary';b.style.padding = '8px 16px';
            b.textContent = 'x' + q;b.dataset.qty = q;
            b.addEventListener('click', function(){
                _pq = q;
                qr.querySelectorAll('button').forEach(function(x){ x.style.borderColor = ''; x.style.color = ''; });
                b.style.borderColor = 'var(--accent)';b.style.color = 'var(--accent)';
                $('buyPrice').innerHTML = formatRastr(_pp.price * q) + ' ' + _MF_ICON_BIG;
                _ck();
            });
            qr.appendChild(b);
        });
        var ac = inn.querySelector('.buy-actions');
        if(ac) inn.insertBefore(qr, ac); else inn.appendChild(qr);
    }
    qr.querySelectorAll('button').forEach(function(x){ x.style.borderColor = ''; x.style.color = ''; });
    var fb = qr.querySelector('button[data-qty="1"]');
    if(fb){ fb.style.borderColor = 'var(--accent)'; fb.style.color = 'var(--accent)'; }
    $('buyModal').classList.add('show');
}

var _ivf='all';

function _rinv(){
    var iv=$('inventory');if(!iv)return;
    if(state.inventory.length===0){iv.innerHTML='<div class="empty-inv">Инвентарь пуст</div>';return;}
    var cacheKey = _ivf + '|' + state.inventory.length;
    var sorted;
    if(_sortedInvCache.key === cacheKey && _sortedInvCache.data){ sorted = _sortedInvCache.data; }
    else {
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
        state.inventory = state.inventory.filter(function(x){return x.uid !== sk.uid;});
        state.balance += (res.sold || sk.price);
        state.totalSold += (res.sold || sk.price);
        _sortedInvCache = { key: '', data: null };
        _ui(); _rinv(); _ri(); _pr();
    } catch(e) {
        _lg(e.message || 'Ошибка продажи','lose');
    } finally {
        _BUSY = false;
    }
}

function _ra(){_buildTicks();_rs1();_rs2();_rt1();_rp1();_ri();_rt2();_rsh();_ui();_rinv();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);_usb();_pr();}
function _usb(){var s=$('speedSlowBtn');var f=$('speedFastBtn');if(!s||!f)return;if(state.spinSpeed==='fast'){s.classList.remove('active');f.classList.add('active');}else{s.classList.add('active');f.classList.remove('active');}}

/* ============================================================
   ПРОФІЛЬ
   ============================================================ */
function _pr(){
    var nl = $('profileNotLogged');
    var ct = $('profileContent');
    if(!nl || !ct) return;
    if(!_CU){ nl.style.display = 'block'; ct.style.display = 'none'; return; }
    nl.style.display = 'none';
    ct.style.display = 'block';

    var nick = _UDN || _CU.displayName || 'Игрок';
    $('profileName').textContent = nick;
    var uidShort = _CU.uid ? ('...' + _CU.uid.slice(-6)) : '—';
    $('profileId').textContent = 'ID: ' + uidShort;

    var isSteam = _CU.uid && _CU.uid.length > 10 && /^[0-9]+$/.test(_CU.uid);
    var steamSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" style="vertical-align:middle;margin-right:6px"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/></svg>';
    var googleSvg = '<svg width="16" height="16" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:6px"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
    $('profileSource').innerHTML = isSteam ? (steamSvg + 'Steam') : (googleSvg + 'Google');
    $('profileSource').style.color = '#fff';

    var av = $('profileAvatar');
    if(_UPA){
        av.innerHTML = '<img src="' + _UPA + '" referrerpolicy="no-referrer" alt="">';
        av.className = 'profile-avatar has-img';
    } else {
        av.textContent = nick.charAt(0).toUpperCase();
        av.className = 'profile-avatar';
    }

    $('profileBalance').innerHTML = formatRastr(state.balance) + ' ' + _MF_ICON;
    $('profileStatWon').innerHTML = formatRastr(state.totalWon) + ' ' + _MF_ICON;
    $('profileStatLost').innerHTML = formatRastr(state.totalLost) + ' ' + _MF_ICON;
    $('profileStatUpgrades').textContent = state.upgrades;
    $('profileStatPurchases').textContent = state.purchases;
    $('profileStatSold').innerHTML = formatRastr(state.totalSold) + ' ' + _MF_ICON;

    var prof = state.totalWon - state.totalLost;
    var pe = $('profileStatProfit');
    pe.innerHTML = (prof >= 0 ? '+' : '') + formatRastr(prof) + ' ' + _MF_ICON;
    pe.className = 'profile-stat-value ' + (prof >= 0 ? 'green' : 'red');

    var bd = $('profileBestContent');
    var bdBox = $('profileBestDrop');
    if(state.bestDrop){
        var freshPrice = _findSkinPrice(state.bestDrop.name);
        if(!freshPrice || freshPrice <= 0) freshPrice = Number(state.bestDrop.price) || 0;
        var dropHtml = '';
        dropHtml += '<div class="profile-best-skin">' + renderSkinIcon(state.bestDrop) + '</div>';
        dropHtml += '<div class="profile-best-name">' + state.bestDrop.name + '</div>';
        dropHtml += '<div class="profile-best-price">' + formatRastr(freshPrice) + ' ' + _MF_ICON + '</div>';
        bd.innerHTML = dropHtml;
        bdBox.className = 'profile-best-drop ' + state.bestDrop.rarity;
    } else {
        bd.innerHTML = '<div class="profile-best-empty">Нет дропа</div>';
        bdBox.className = 'profile-best-drop';
    }
}

/* ============================================================
   ПОДІЇ
   ============================================================ */
function _ah(){
    var lb=$('logoBtn');
    if(lb) lb.addEventListener('click', function(e){
        e.preventDefault();_ck();
        document.querySelectorAll('.nav-tab').forEach(function(x){ x.classList.remove('active'); });
        document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
        var upTab = document.querySelector('.nav-tab[data-page="upgrade"]');
        if(upTab) upTab.classList.add('active');
        var upPage = $('page-upgrade');
        if(upPage) upPage.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        _sl();
    });

    var ub=$('userBadge');
    if(ub)ub.addEventListener('click',function(){
        if(_CU){
            document.querySelectorAll('.nav-tab').forEach(function(x){ x.classList.remove('active'); });
            document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
            var pTab = document.querySelector('.nav-tab[data-page="profile"]');
            if(pTab) pTab.classList.add('active');
            var pPage = $('page-profile');
            if(pPage) pPage.classList.add('active');
            _pr();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            _ck();
        } else { _oa(); }
    });

    var lc=$('logoutConfirm');if(lc)lc.addEventListener('click',_lo);
    var lx=$('logoutCancel');if(lx)lx.addEventListener('click',function(){_ck();_cl();});
    var ss=$('speedSlowBtn');if(ss)ss.addEventListener('click',function(){_un();_ck();state.spinSpeed='slow';_usb();save();});
    var sf=$('speedFastBtn');if(sf)sf.addEventListener('click',function(){_un();_ck();state.spinSpeed='fast';_usb();save();});
    var rc=$('resultContinue');if(rc)rc.addEventListener('click',_cr);
    var sb=$('soundBtn');if(sb)sb.addEventListener('click',function(){state.soundOn=!state.soundOn;$('soundIcon').textContent=state.soundOn?'S':'M';if(state.soundOn){_un();_ck();}save();});

    var plb = $('profileLoginBtn');
    if(plb) plb.addEventListener('click', function(){ _ck(); _oa(); });
    var ptop = $('profileTopupBtn');
    if(ptop) ptop.addEventListener('click', function(){ _ck(); _lg('Пополнение скоро','info'); });
    var pcl = $('profileCloseBtn');
    if(pcl) pcl.addEventListener('click', function(){ _ck(); _pr(); _lg('Обновлено','info'); });
    var plo = $('profileLogoutBtn');
    if(plo) plo.addEventListener('click', function(){ _ck(); _ol(); });

    var bcf=$('buyConfirm');
    if(bcf)bcf.addEventListener('click',async function(){
        if(_BUSY) return;
        if(!_pp) return;
        var sk=_pp.skin;var q=_pq||1;
        _ck();
        if(!_CU){_lg('Войди в аккаунт','lose');return;}
        _BUSY = true;bcf.disabled = true;bcf.textContent = '...';
        try {
            var r = await window.apiClient.buyItem(sk.id, q);
            _by();
            _lg('Куплено: '+sk.name+' x'+q,'win');
            state.balance = r.balance;
            state.inventory = _mapInv(r.inventory);
            state.totalLost += (r.spent || 0);
            state.purchases += q;
            state.profit = Math.round((state.totalWon - state.totalLost) * 100) / 100;
            _sortedInvCache = { key: '', data: null };
            _ui(); _rinv(); _ri(); _pr(); _rsh();
            $('buyModal').classList.remove('show');
            _pp=null; _pq=1;
        } catch(e) {
            _lg(e.message || 'Ошибка покупки','lose');
            console.error('buy error', e);
        } finally {
            _BUSY = false;bcf.disabled = false;bcf.textContent = 'КУПИТЬ';
        }
    });

    var bc=$('buyCancel');if(bc)bc.addEventListener('click',function(){_ck();$('buyModal').classList.remove('show');_pp=null;_pq=1;});

    var sa=$('sellAllBtn');
    if(sa)sa.addEventListener('click',async function(){
        if(_BUSY) return;
        if(state.inventory.length===0)return;
        if(!_CU){_lg('Войди в аккаунт','lose');return;}
        if(!confirm('Продать всё?'))return;
        _ck();_BUSY = true;sa.disabled = true;
        try {
            var res = await window.apiClient.sellAllItems();
            _by();
            _lg('Продано всё: +'+formatRastr(res.total||0),'win');
            state.balance += (res.total || 0);
            state.totalSold += (res.total || 0);
            state.inventory = [];
            _sortedInvCache = { key: '', data: null };
            _ui(); _rinv(); _ri(); _pr();
        } catch(e) {
            _lg(e.message || 'Ошибка продажи','lose');
        } finally {
            _BUSY = false;sa.disabled = false;
        }
    });

    var ub2=$('upgradeBtn');if(ub2)ub2.addEventListener('click',_hu);

    var ss1=$('sourceSlot1');
    if(ss1)ss1.addEventListener('click',function(){
        if(state.upgradeSource)return;
        _un();_ck();
        var p=document.querySelector('.upg-inv-panel');
        if(p)p.scrollIntoView({behavior:'smooth',block:'center'});
    });

    var ss22=$('sourceSlot2');
    if(ss22)ss22.addEventListener('click',function(){
        if(!state.upgradeSource){_lg('Сначала выбери первый предмет','lose');return;}
        if(state.upgradeSource2)return;
        _un();_ck();
        var p=document.querySelector('.upg-inv-panel');
        if(p)p.scrollIntoView({behavior:'smooth',block:'center'});
    });

    var asb=$('addSecondBtn');
    if(asb)asb.addEventListener('click',function(){
        if(!state.upgradeSource){_lg('Сначала выбери первый предмет','lose');return;}
        if(state.upgradeSource2)return;
        _un();_ck();
        var p=document.querySelector('.upg-inv-panel');
        if(p)p.scrollIntoView({behavior:'smooth',block:'center'});
        _lg('Выбери второй предмет в инвентаре','info');
    });

    var ts2=$('targetSlot');
    if(ts2)ts2.addEventListener('click',function(){
        if(state.upgradeTarget)return;
        _un();_ck();
        var p=document.querySelector('.upg-items-panel');
        if(p)p.scrollIntoView({behavior:'smooth',block:'center'});
    });

    var sr=$('sourceRemoveBtn');
    if(sr)sr.addEventListener('click',function(e){
        e.stopPropagation();
        if(_BUSY || state.upgrading) return;
        _un();_ck();_rz();
    });

    var tr=$('targetRemoveBtn');
    if(tr)tr.addEventListener('click',function(e){
        e.stopPropagation();
        if(_BUSY || state.upgrading) return;
        _un();_ck();
        state.upgradeTarget=null;state.selectedPreset=null;
        _tgCache={};_rt1();_rp1();_uc();
    });

    var is=$('invSearch');if(is)is.addEventListener('input',_ri);
    var its=$('itemsSearch');if(its)its.addEventListener('input',_rt2);
    var so=$('shopSort');if(so)so.addEventListener('change',function(e){state.shopSort=e.target.value;_sv=20;_rsh();save();_ck();});
    document.querySelectorAll('.shop-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();document.querySelectorAll('.shop-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');state.shopFilter=b.dataset.rarity;_sv=20;_rsh();save();});});
    document.querySelectorAll('.inv-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();document.querySelectorAll('.inv-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');_ivf=b.dataset.rarity;_sortedInvCache={key:'',data:null};_rinv();});});
    document.querySelectorAll('.nav-tab').forEach(function(t){t.addEventListener('click',function(){_un();_ck();_sl();document.querySelectorAll('.nav-tab').forEach(function(x){x.classList.remove('active');});document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});t.classList.add('active');$('page-'+t.dataset.page).classList.add('active');if(t.dataset.page==='shop'){_sv=20;_rsh();}if(t.dataset.page==='inventory')_rinv();if(t.dataset.page==='upgrade'){_ri();_rt2();}if(t.dataset.page==='profile'){_pr();}});});
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
    loadPricesFromApi();
    _pr();
}

window.state=state;
window.save=save;
window.log=_lg;
window.renderAll=_ra;
window.updateUI=_ui;
window.renderProfile=_pr;
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
