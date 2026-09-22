(function(){
'use strict';

/* ============================================================
   FIRESTORE PRICES
   ============================================================ */
var _firestorePrices = {};

function _findSkinPrice(steamName){
    if(!steamName) return 0;
    var key = (steamName || '').toLowerCase().replace(/[^a-zа-я0-9]/gi,'');
    
    // 1. Firestore (точне співпадіння)
    if(_firestorePrices[key] !== undefined) return _firestorePrices[key];
    
    // 2. Firestore (часткове)
    for(var k in _firestorePrices){
        if(key.indexOf(k) >= 0 || k.indexOf(key) >= 0){
            return _firestorePrices[k];
        }
    }
    
    // 3. Локальний SKINS (fallback)
    var localPrice = 0;
    if(window.SKINS){
        window.SKINS.forEach(function(s){
            var sName = (s.name || '').toLowerCase().replace(/[^a-zа-я0-9]/gi,'');
            if(sName && key.indexOf(sName) >= 0){
                if(s.price > localPrice) localPrice = s.price;
            }
        });
    }
    
    return localPrice;
}

function _a1(s){
    if(!s) return 0;
    var fsPrice = _findSkinPrice(s.name);
    if(fsPrice > 0) return fsPrice;
    return s.price || 0;
}

async function loadPricesFromFirestore(){
    if(!window.fbDb) return;
    try{
        var snap = await window.fbGetDocs(window.fbCollection(window.fbDb,'skins'));
        var count = 0;
        snap.forEach(function(doc){
            var d = doc.data();
            if(d.name && d.price){
                var key = (d.name || '').toLowerCase().replace(/[^a-zа-я0-9]/gi,'');
                _firestorePrices[key] = d.price;
                count++;
            }
        });
        console.log('✅ Загружено цен из Firestore:', count);
        if(typeof renderSteamInv === 'function') renderSteamInv();
        if(typeof updateTradeSummary === 'function') updateTradeSummary();
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
var _CU=null,_CT=null;
var _UDN='';var _UPA='';
var _steamId='';
var _steamAppId='730';
var _steamInv=[];
var _steamSelected={};
var _ndl=null;
var _invPageSize=50;
var _invPage=1;

var _MF='https://api.yrsproject.ru/public/image/Resize?shortname=metal.fragments&x=64&y=64';
var _MF_ICON='<img src="'+_MF+'" style="width:22px;height:22px;vertical-align:middle;display:inline-block" alt="">';
var _MF_ICON_BIG='<img src="'+_MF+'" style="width:32px;height:32px;vertical-align:middle;display:inline-block" alt="">';

function _fb(){
    if(!window.fbReady){setTimeout(_fb,100);return;}
    window.fbOnAuthStateChanged(window.fbAuth,async function(u){
        if(u){
            _CU={uid:u.uid,email:u.email,displayName:u.displayName,photoURL:u.photoURL};
            _ca();_rs();await _lc();_ra();_ub();
            renderMyTrades();
            checkExpiredTrades();
            var isSteam=_CU.uid && _CU.uid.length>10 && /^[0-9]+$/.test(_CU.uid);
            if(isSteam){
                _steamId=_CU.uid;
                var tc=document.getElementById('tradeContent');
                var tn=document.getElementById('tradeNotLogged');
                if(tc)tc.style.display='block';
                if(tn)tn.style.display='none';
                loadSteamInventory(_steamAppId);
            }else{
                var tc2=document.getElementById('tradeContent');
                var tn2=document.getElementById('tradeNotLogged');
                if(tc2)tc2.style.display='none';
                if(tn2)tn2.style.display='block';
            }
            _lg('👤 Добро пожаловать!','win');
        }else{
            _CU=null;_UDN='';_UPA='';_steamId='';_steamInv=[];_steamSelected={};
            _rs();_ra();_ub();_oa();
            var tc3=document.getElementById('tradeContent');
            var tn3=document.getElementById('tradeNotLogged');
            if(tc3)tc3.style.display='none';
            if(tn3)tn3.style.display='block';
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
}

async function _lc(){
    if(!_CU||!window.fbDb)return;
    try{
        var r=window.fbDoc(window.fbDb,'users',_CU.uid);
        var s=await window.fbGetDoc(r);
        if(s.exists()){
            var d=s.data();
            Object.keys(d).forEach(function(k){state[k]=d[k];});
            state.inventory=(state.inventory||[]).map(resolveSkin).filter(Boolean);
            if(state.bestDrop)state.bestDrop=resolveSkin(state.bestDrop);
            if(state.bestUpgrade)state.bestUpgrade=resolveSkin(state.bestUpgrade);
            if(d.displayName)_UDN=d.displayName;
            if(d.photoURL)_UPA=d.photoURL;
        }else{
            state.balance=START_BALANCE;
            await _sc();
        }
    }catch(e){console.error(e);state.balance=START_BALANCE;}
}

async function _sc(){
    if(!_CU||!window.fbDb)return;
    try{
        var d={
            balance:state.balance,
            inventory:state.inventory.map(function(i){return{id:i.id,rarity:i.rarity};}),
            profit:state.profit,
            totalWon:state.totalWon,totalLost:state.totalLost,
            upgrades:state.upgrades,purchases:state.purchases,
            bestDrop:state.bestDrop?{id:state.bestDrop.id,rarity:state.bestDrop.rarity}:null,
            bestUpgrade:state.bestUpgrade?{id:state.bestUpgrade.id,rarity:state.bestUpgrade.rarity}:null,
            housePlayerLost:state.housePlayerLost,houseCasinoWon:state.houseCasinoWon,
            xp:state.xp,level:state.level,
            soundOn:state.soundOn,
            shopFilter:state.shopFilter,shopSort:state.shopSort,
            spinSpeed:state.spinSpeed,
            updatedAt:Date.now()
        };
        var r=window.fbDoc(window.fbDb,'users',_CU.uid);
        await window.fbSetDoc(r,d);
    }catch(e){console.error(e);}
}

function save(){if(!_CU)return;if(_CT)clearTimeout(_CT);_CT=setTimeout(_sc,800);}
function _ol(){var m=document.getElementById('logoutModal');if(m)m.classList.add('show');}
function _cl(){var m=document.getElementById('logoutModal');if(m)m.classList.remove('show');}
async function _lo(){_cl();try{await _sc();await window.fbSignOut(window.fbAuth);_lg('👋 Вы вышли','info');}catch(e){console.error(e);}}

function _ub(){
    var b=document.getElementById('userBadge');
    var i=document.getElementById('userBadgeIcon');
    if(!b||!i)return;
    if(_CU){
        b.title='Выйти';
        if(_UPA){i.innerHTML='<img src="'+_UPA+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">';}
        else{i.textContent='🚪';}
    }else{b.title='Войти';i.textContent='👤';}
}
function _oa(){var m=document.getElementById('authModal');if(m)m.classList.add('show');}
function _ca(){var m=document.getElementById('authModal');if(m)m.classList.remove('show');}

var state={
    balance:0,inventory:[],profit:0,
    totalWon:0,totalLost:0,upgrades:0,purchases:0,
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
    state.totalWon=0;state.totalLost=0;state.upgrades=0;state.purchases=0;
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

var _SF={spin:'spin.mp3',win_common:'win_common.mp3',win_legendary:'win_legendary.mp3',lose:'lose.mp3',click:'click.mp3',buy:'buy.mp3',levelup:'levelup.mp3'};
var _SD={};var _AU=false;
function _pl(){Object.keys(_SF).forEach(function(k){var a=new Audio();a.src=_SF[k];a.preload='auto';a.volume=0.7;a.load();_SD[k]=a;});}
function _un(){if(_AU)return;_AU=true;Object.keys(_SD).forEach(function(k){var s=_SD[k];if(!s)return;s.volume=0;s.play().then(function(){s.pause();s.currentTime=0;s.volume=0.7;}).catch(function(){});});}
function _sn(n,v){if(!state.soundOn)return;var s=_SD[n];if(!s)return;try{var c=s.cloneNode();c.volume=v||0.7;c.play().catch(function(){});}catch(e){}}
function _ck(){_sn('click',0.6);}
function _wn(r){if(r==='legendary'||r==='mythical')_sn('win_legendary',0.9);else _sn('win_common',0.8);}
function _ls(){_sn('lose',0.8);}
function _by(){_sn('buy',0.8);}
function _lu(){_sn('levelup',0.9);}
var _LP={};
function _sp(n,v){
    if(!state.soundOn)return null;
    var s=_SD[n];if(!s)return null;
    if(_LP[n]){try{_LP[n].pause();}catch(e){}}
    var c=s.cloneNode();c.volume=v||0.6;c.loop=true;c.play().catch(function(){});
    _LP[n]=c;
    return{
        stop:function(){if(_LP[n]){try{_LP[n].pause();}catch(e){}_LP[n]=null;}},
        fadeStop:function(d){
            d=d||800;var a=_LP[n];if(!a)return;
            var sv=a.volume;var st=performance.now();
            var iv=setInterval(function(){
                var t=(performance.now()-st)/d;
                if(t>=1){clearInterval(iv);try{a.pause();}catch(e){}_LP[n]=null;return;}
                a.volume=Math.max(0,sv*(1-t));
            },80);
        }
    };
}
function _sl(){Object.keys(_LP).forEach(function(k){if(_LP[k]){try{_LP[k].pause();}catch(e){}_LP[k]=null;}});}
function _us(d){d=d||4000;var h=_sp('spin',0.55);if(!h)return null;setTimeout(function(){h.fadeStop(800);},d-800);return h;}
_pl();

function _lg(m,t){
    t=t||'info';
    var w=$('toastWrap');if(!w)return;
    while(w.children.length>=5)w.removeChild(w.firstChild);
    var e=document.createElement('div');
    e.className='toast '+t;
    e.innerHTML='<span class="toast-icon">'+(t==='win'?'✅':t==='lose'?'❌':t==='jackpot'?'🔥':'ℹ️')+'</span><span>'+m+'</span>';
    w.appendChild(e);
    setTimeout(function(){
        e.style.transition='all 0.4s';
        e.style.opacity='0';
        e.style.transform='translateX(120%)';
        setTimeout(function(){e.remove();},400);
    },3500);
}

function _ch(sp,tp){var c=(sp/tp)*100*0.90;if(c>95)c=95;if(c<0.01)c=0.01;return c;}
function _tg(tp,ss){var b=null,bd=Infinity;SKINS.forEach(function(s){if(ss&&s.id===ss.id)return;if(ss&&_a1(s)<=_a1(ss))return;var d=Math.abs(_a1(s)-tp);if(d<bd){bd=d;b=s;}});return b;}
function _xp(n){state.xp+=n;var p=state.level;for(var i=_L.length-1;i>=0;i--){if(state.xp>=_L[i].xp){state.level=_L[i].lvl;break;}}if(state.level>p){for(var l=p+1;l<=state.level;l++){_lg('⬆️ Уровень '+l+'!','win');}_lu();}}

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
    DOM.invValue.innerHTML=formatRastr(state.inventory.reduce(function(s,i){return s+_a1(i);},0))+' '+_MF_ICON;
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
    save();
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
function _na(d){if(!_ndl)_ndl=$('circleNeedle');if(_ndl)_ndl.style.transform='rotate('+d+'deg)';}
function _cc(c,t,k){_dc(c);$('circlePercent').textContent=Math.round(c)+'%';var s=$('circleStatus');s.textContent=t||'';s.className='upg-status '+(k||'');var co;if(c>=65)co='#7ed321';else if(c>=35)co='#f5c542';else if(c>=15)co='#ff6b1a';else co='#ff3b3b';$('circlePercent').style.color=co;}
function _rs1(){var s=$('sourceSlot');if(!s)return;if(state.upgradeSource){s.className='upg-item-slot filled '+state.upgradeSource.rarity;s.innerHTML=renderSkinIcon(state.upgradeSource)+'<div class="upg-item-name">'+state.upgradeSource.name+'</div><div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeSource.rarity].color+'">'+RARITIES[state.upgradeSource.rarity].name+'</div>';$('sourcePriceLabel').innerHTML=formatRastr(_a1(state.upgradeSource))+' '+_MF_ICON;$('sourceRemoveBtn').style.display='block';}else{s.className='upg-item-slot';s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">+</div><div class="upg-item-empty-text">Выбрать предмет</div></div>';$('sourcePriceLabel').textContent='—';$('sourceRemoveBtn').style.display='none';}}
function _rt1(){var s=$('targetSlot');if(!s)return;if(state.upgradeTarget){s.className='upg-item-slot filled '+state.upgradeTarget.rarity;s.innerHTML=renderSkinIcon(state.upgradeTarget)+'<div class="upg-item-name">'+state.upgradeTarget.name+'</div><div class="upg-item-rarity" style="color:'+RARITIES[state.upgradeTarget.rarity].color+'">'+RARITIES[state.upgradeTarget.rarity].name+'</div>';$('targetPriceLabel').innerHTML=formatRastr(_a1(state.upgradeTarget))+' '+_MF_ICON;$('targetRemoveBtn').style.display='block';}else{s.className='upg-item-slot';s.innerHTML='<div class="upg-item-empty"><div class="upg-item-empty-icon">?</div><div class="upg-item-empty-text">Цель</div></div>';$('targetPriceLabel').textContent='—';$('targetRemoveBtn').style.display='none';}}
function _uc(){if(!state.upgradeSource||!state.upgradeTarget){_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);DOM.upgradeBtn.disabled=true;return;}var c=_ch(_a1(state.upgradeSource),_a1(state.upgradeTarget));state.upgradeTarget._realChance=c;var s,sc;if(c>=60){s='ВЫСОКИЙ ШАНС';sc='win';}else if(c>=30){s='СРЕДНИЙ ШАНС';sc='';}else if(c>=10){s='РИСК';sc='';}else if(c>=1){s='ХАЙ РИСК';sc='lose';}else{s='ПОЧТИ НЕВОЗМОЖНО';sc='lose';}_cc(c,s,sc);_na(0);DOM.upgradeBtn.disabled=false;}
function _rp1(){var cn=$('presetContainer');if(!cn)return;var f=document.createDocumentFragment();var hs=!!state.upgradeSource;_P.forEach(function(p,i){var b=document.createElement('button');b.className='upg-preset-btn';b.disabled=!hs;b.dataset.idx=i;var dt='—';if(hs){var sp=_a1(state.upgradeSource);var tp=sp*p.mult;var t=_tg(tp,state.upgradeSource);if(t&&_a1(t)>sp){var rc=_ch(sp,_a1(t));if(rc>=10)dt=Math.round(rc)+'%';else dt=rc.toFixed(2)+'%';}}b.innerHTML='<span class="upg-preset-mult">'+p.label+'</span><span class="upg-preset-chance">'+dt+'</span>';if(state.selectedPreset===i)b.classList.add('active');b.addEventListener('click',function(e){e.stopPropagation();_sp2(i);});f.appendChild(b);});cn.replaceChildren(f);}
function _sp2(i){if(!state.upgradeSource){_lg('❌ Сначала выбери предмет','lose');_ck();return;}_un();_ck();if(_a1(state.upgradeSource)>=_MX*0.99){_lg('❌ Это максимальный скин — апгрейд невозможен','lose');return;}var p=_P[i];var sp=_a1(state.upgradeSource);var tp=sp*p.mult;var t=_tg(tp,state.upgradeSource);if(!t||_a1(t)<=sp){_lg('❌ Нет подходящей цели дороже твоего предмета','lose');return;}if(_a1(t)>_MX){_lg('❌ Нет цели дороже макс скина','lose');return;}state.upgradeTarget=t;state.selectedPreset=i;state.upgradeTarget._realChance=_ch(sp,_a1(t));_rt1();_rp1();_uc();}
function _ri(){var l=$('invPanelList');if(!l)return;var f=state.invPanelFilter;var s=($('invSearch').value||'').toLowerCase();var sr=state.inventory.slice().sort(function(a,b){return _a1(b)-_a1(a);});if(f!=='all')sr=sr.filter(function(x){return x.rarity===f;});if(s)sr=sr.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});$('invPanelCount').textContent=state.inventory.length+' шт.';if(sr.length===0){l.innerHTML='<div class="upg-inv-empty">Инвентарь пуст</div>';return;}var fr=document.createDocumentFragment();sr.forEach(function(sk){var e=document.createElement('div');e.className='upg-inv-item '+sk.rarity;if(state.upgradeSource&&state.upgradeSource===sk)e.classList.add('used');e.innerHTML=renderSkinIcon(sk)+'<div class="upg-inv-name">'+sk.name+'</div><div class="upg-inv-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';e.addEventListener('click',function(){_un();_ck();state.upgradeSource=sk;state.upgradeTarget=null;state.selectedPreset=null;_rs1();_rt1();_ri();_rp1();_uc();});fr.appendChild(e);});l.replaceChildren(fr);}
function _rt2(){var g=$('itemsPanelGrid');if(!g)return;var f=state.itemsPanelFilter;var s=($('itemsSearch').value||'').toLowerCase();var it=SKINS.slice();if(f!=='all')it=it.filter(function(x){return x.rarity===f;});if(s)it=it.filter(function(x){return x.name.toLowerCase().indexOf(s)>=0;});$('targetsCount').textContent=it.length;if(it.length===0){g.innerHTML='<div class="upg-inv-empty" style="grid-column:1/-1">Ничего не найдено</div>';return;}var fr=document.createDocumentFragment();it.forEach(function(sk){var e=document.createElement('div');e.className='upg-target-item '+sk.rarity;if(state.upgradeTarget&&state.upgradeTarget.id===sk.id){e.style.borderColor='#f5c542';e.style.boxShadow='0 0 20px rgba(245,197,66,0.5)';}e.innerHTML=renderSkinIcon(sk)+'<div class="upg-target-name">'+sk.name+'</div><div class="upg-target-price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div>';e.addEventListener('click',function(){if(!state.upgradeSource){_lg('❌ Сначала выбери свой предмет','lose');_ck();return;}if(sk.id===state.upgradeSource.id){_lg('❌ Нельзя апгрейдить в самого себя','lose');_ck();return;}if(_a1(sk)<=_a1(state.upgradeSource)){_lg('❌ Цель должна быть дороже','lose');_ck();return;}if(_a1(sk)>_MX){_lg('❌ Нет цели дороже макс скина','lose');_ck();return;}_un();_ck();state.upgradeTarget=sk;state.selectedPreset=null;state.upgradeTarget._realChance=_ch(_a1(state.upgradeSource),_a1(sk));_rt1();_rp1();_uc();});fr.appendChild(e);});g.replaceChildren(fr);}

function _pa(c,w){
    return new Promise(function(res){
        var d=state.spinSpeed==='fast'?2000:4000;
        var se=c*3.6;
        var fa;
        if(w){
            var m=Math.min(se*0.15,8);
            fa=Math.max(m,Math.random()*(se-m));
        }else{
            var os=se+3;
            var oe=357;
            if(os>=oe)fa=(se+3+Math.random()*3)%360;
            else fa=os+Math.random()*(oe-os);
        }
        var fs=state.spinSpeed==='fast'?5+Math.floor(Math.random()*3):8+Math.floor(Math.random()*4);
        var tr=fs*360+fa;
        var st=performance.now();
        var sd=_us(d);
        if(!_ndl)_ndl=$('circleNeedle');
        function an(now){
            var t=Math.min(1,(now-st)/d);
            var ez=1-Math.pow(1-t,5);
            if(_ndl)_ndl.style.transform='rotate('+((tr*ez)%360)+'deg)';
            if(t<1)requestAnimationFrame(an);
            else{
                if(_ndl)_ndl.style.transform='rotate('+fa+'deg)';
                if(sd)sd.stop();
                var s=$('circleStatus');
                if(w){s.textContent='✅ ПОБЕДА';s.className='upg-status win';}
                else{s.textContent='❌ ПРОВАЛ';s.className='upg-status lose';}
                setTimeout(res,900);
            }
        }
        requestAnimationFrame(an);
    });
}

function _hu(){
    if(!state.upgradeSource||!state.upgradeTarget)return;
    if(state.upgrading)return;
    if(state.inventory.indexOf(state.upgradeSource)<0){_rz();_lg('❌ Предмет больше не в инвентаре','lose');return;}
    if(_a1(state.upgradeSource)>=_MX*0.99){_lg('❌ Это максимальный скин — апгрейд невозможен','lose');_rz();return;}
    if(state.upgradeTarget.id===state.upgradeSource.id||_a1(state.upgradeTarget)<=_a1(state.upgradeSource)){_lg('❌ Недопустимая цель','lose');_rz();return;}
    _un();
    var b=$('upgradeBtn');b.style.pointerEvents='none';
    var c=state.upgradeTarget._realChance;if(c===undefined)c=_ch(_a1(state.upgradeSource),_a1(state.upgradeTarget));
    var r=Math.random()*100;var ok=r<c;
    state.upgrading=true;state.upgrades++;b.disabled=true;
    var ss=state.upgradeSource;var ts=state.upgradeTarget;var sv=_a1(ss);var tv=_a1(ts);
    _xp(20);
    _pa(c,ok).then(function(){
        var i=state.inventory.indexOf(ss);if(i>=0)state.inventory.splice(i,1);
        if(ok){
            state.inventory.push(ts);state.totalWon+=tv;state.profit+=tv-sv;state.houseCasinoWon+=tv;
            if(!state.bestUpgrade||tv>_a1(state.bestUpgrade))state.bestUpgrade=ts;
            _wn(ts.rarity);
            _sr({type:'result-win',icon:'🏆',title:'✅ УСПЕХ',skin:ts,value:'+'+formatRastr(tv)+' '+_MF_ICON,canSell:true,sellCallback:function(){var j=state.inventory.indexOf(ts);if(j>=0){state.inventory.splice(j,1);state.balance+=_a1(ts);_ui();_rinv();_ri();save();}}});
            _lg('⚡ '+ss.name+' → '+ts.name+' ✅','win');
        }else{
            state.totalLost+=sv;state.profit-=sv;state.housePlayerLost+=sv;_ls();
            _sr({type:'result-lose',icon:'💀',title:'❌ ПРОВАЛ',skin:null,value:'Потеряно: '+formatRastr(sv)+' '+_MF_ICON,canSell:false});
            _lg('⚡ '+ss.name+' → провал ❌','lose');
        }
        state.upgradeSource=null;state.upgradeTarget=null;state.selectedPreset=null;state.upgrading=false;
        b.style.pointerEvents='';b.disabled=true;
        _rs1();_rt1();_ri();_rt2();_rp1();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);_ui();_rinv();save();
    });
}
function _ipf(cid,fk,cb){var cn=$(cid);if(!cn)return;cn.innerHTML='';var a=document.createElement('button');a.className='upg-inv-filter active';a.textContent='Все';a.dataset.filter='all';cn.appendChild(a);Object.entries(RARITIES).forEach(function(kv){var b=document.createElement('button');b.className='upg-inv-filter';b.textContent=kv[1].name;b.dataset.filter=kv[0];b.style.color=kv[1].color;cn.appendChild(b);});cn.querySelectorAll('.upg-inv-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();cn.querySelectorAll('.upg-inv-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');state[fk]=b.dataset.filter;cb();});});}
var _sv=20;var _pp=null;var _pq=1;

function _rsh(){var g=$('shopGrid');if(!g)return;var it=SKINS.slice();if(state.shopFilter!=='all')it=it.filter(function(x){return x.rarity===state.shopFilter;});var ro={common:0,rare:1,legendary:2,mythical:3};if(state.shopSort==='price-asc')it.sort(function(a,b){return _a1(a)-_a1(b);});else if(state.shopSort==='price-desc')it.sort(function(a,b){return _a1(b)-_a1(a);});else if(state.shopSort==='rarity')it.sort(function(a,b){return ro[a.rarity]-ro[b.rarity];});else if(state.shopSort==='name')it.sort(function(a,b){return a.name.localeCompare(b.name);});if(it.length===0){g.innerHTML='<div class="empty-inv">Ничего не найдено</div>';return;}var v=it.slice(0,_sv);var fr=document.createDocumentFragment();v.forEach(function(sk){var p=_a1(sk);var ca=state.balance>=p;var e=document.createElement('div');e.className='shop-item '+sk.rarity;e.innerHTML=renderSkinIcon(sk)+'<div class="name">'+sk.name+'</div><div class="rarity-label" style="color:'+RARITIES[sk.rarity].color+'">'+RARITIES[sk.rarity].name+'</div><div class="price-row"><span class="price">'+formatRastr(p)+' '+_MF_ICON+'</span></div><button class="buy-btn" '+(ca?'':'disabled')+'>'+(ca?'КУПИТЬ':'НЕ ХВАТАЕТ')+'</button>';e.querySelector('.buy-btn').addEventListener('click',function(ev){ev.stopPropagation();if(!ca){_lg('❌ Недостаточно средств','lose');_ck();return;}_ob(sk,p);});fr.appendChild(e);});if(it.length>_sv){var m=document.createElement('button');m.className='btn-secondary';m.textContent='Показать ещё ('+(it.length-_sv)+')';m.style.gridColumn='1/-1';m.style.marginTop='16px';m.addEventListener('click',function(){_sv+=20;_rsh();});fr.appendChild(m);}g.replaceChildren(fr);}

function _ob(sk,p){_un();_ck();_pp={skin:sk,price:p};_pq=1;$('buyIcon').innerHTML=renderSkinIcon(sk);$('buyTitle').textContent=sk.name;$('buySub').textContent=RARITIES[sk.rarity].name+' · Выбери количество:';$('buyPrice').innerHTML=formatRastr(p)+' '+_MF_ICON_BIG;var inn=$('buyInner');if(!inn)return;var qr=inn.querySelector('.buy-qty-row');if(!qr){qr=document.createElement('div');qr.className='buy-qty-row';qr.style.cssText='display:flex;gap:8px;justify-content:center;margin:14px 0;flex-wrap:wrap';[1,5,10,50].forEach(function(q){var b=document.createElement('button');b.className='btn-secondary';b.style.padding='8px 16px';b.textContent='x'+q;b.dataset.qty=q;b.addEventListener('click',function(){_pq=q;qr.querySelectorAll('button').forEach(function(x){x.style.borderColor='';x.style.color='';});b.style.borderColor='var(--accent)';b.style.color='var(--accent)';$('buyPrice').innerHTML=formatRastr(p*q)+' '+_MF_ICON_BIG;_ck();});qr.appendChild(b);});var ac=inn.querySelector('.buy-actions');if(ac)inn.insertBefore(qr,ac);else inn.appendChild(qr);}qr.querySelectorAll('button').forEach(function(x){x.style.borderColor='';x.style.color='';});var fb=qr.querySelector('button[data-qty="1"]');if(fb){fb.style.borderColor='var(--accent)';fb.style.color='var(--accent)';}$('buyModal').classList.add('show');}

/* ============================================================
   ВЫВОД СКИНОВ
   ============================================================ */
async function _withdraw(skin){
    if(!_CU){_lg('❌ Войди в аккаунт','lose');return;}
    var steamUrl = _steamId ? 'https://steamcommunity.com/profiles/'+_steamId : '';
    if(!steamUrl){
        var url = prompt('📤 Вставь свою Steam Trade-ссылку:\n\nЕсли не знаешь где взять — нажми ОК, и мы перекинем тебя на твою трейд-ссылку в Steam.','');
        if(url === null) return;
        if(!url || url.indexOf('steamcommunity.com')<0){
            if(_CU && _CU.uid && /^[0-9]+$/.test(_CU.uid)){
                window.open('https://steamcommunity.com/profiles/'+_CU.uid+'/tradeoffers/privacy','_blank');
            }else{
                window.open('https://steamcommunity.com/my/tradeoffers/privacy','_blank');
            }
            _lg('🔗 Открыли Steam. Скопируй свою трейд-ссылку и нажми ВИВЕСТИ снова.','info');
            return;
        }
        steamUrl = url;
    }
    if(!confirm('Вивести "'+skin.name+'" в Steam?\n\nСкин будет заморожен до отправки трейда.')) return;
    try{
        var idx = state.inventory.indexOf(skin);
        if(idx < 0){_lg('❌ Скин не найден','lose');return;}
        await window.fbAddDoc(
            window.fbCollection(window.fbDb, 'withdrawals'),
            {
                uid: _CU.uid,
                displayName: _UDN||_CU.displayName||'Игрок',
                skinId: skin.id,
                skinName: skin.name,
                skinPrice: _a1(skin),
                steamUrl: steamUrl,
                status: 'pending',
                createdAt: Date.now()
            }
        );
        _lg('✅ Заявка на вывод создана! Админ отправит трейд.','win');
        _rinv();
        _ri();
        _ui();
    }catch(e){
        console.error('Withdraw error:',e);
        _lg('❌ Ошибка: '+e.message,'lose');
    }
}

var _ivf='all';
function _rinv(){
    var iv=$('inventory');
    if(!iv)return;
    if(state.inventory.length===0){iv.innerHTML='<div class="empty-inv">Инвентарь пуст!<br><br>Купи скины в магазине.</div>';return;}
    var sr=state.inventory.slice().sort(function(a,b){return _a1(b)-_a1(a);});
    if(_ivf!=='all')sr=sr.filter(function(x){return x.rarity===_ivf;});
    if(sr.length===0){iv.innerHTML='<div class="empty-inv">Ничего не найдено</div>';return;}
    var fr=document.createDocumentFragment();
    sr.forEach(function(sk){
        var e=document.createElement('div');
        e.className='inv-item '+sk.rarity;
        e.innerHTML=renderSkinIcon(sk)+'<div class="name">'+sk.name+'</div><div class="price">'+formatRastr(_a1(sk))+' '+_MF_ICON+'</div><button class="sell-btn">Продать</button><button class="withdraw-btn" style="position:absolute;bottom:6px;left:6px;background:#4aa8ff;border:none;color:#fff;padding:4px 10px;font-family:inherit;font-size:0.65rem;font-weight:700;cursor:pointer;border-radius:6px;opacity:0">📤 ВИВЕСТИ</button>';
        e.querySelector('.sell-btn').addEventListener('click',function(ev){ev.stopPropagation();_ssk(sk);});
        e.querySelector('.withdraw-btn').addEventListener('click',function(ev){ev.stopPropagation();_withdraw(sk);});
        fr.appendChild(e);
    });
    iv.replaceChildren(fr);
}
function _ssk(sk){var i=state.inventory.indexOf(sk);if(i<0)return;var price=_a1(sk);state.inventory.splice(i,1);state.balance+=price;if(state.upgradeSource===sk)_rz();_ui();_rinv();_ri();_ck();_lg('💰 Продано: '+sk.name+' +'+formatRastr(price),'info');save();}
function _ra(){_rs1();_rt1();_rp1();_ri();_rt2();_rsh();_ui();_rinv();_cc(0,'ВЫБЕРИ ПРЕДМЕТ','');_na(0);_usb();}
function _usb(){var s=$('speedSlowBtn');var f=$('speedFastBtn');if(!s||!f)return;if(state.spinSpeed==='fast'){s.classList.remove('active');f.classList.add('active');}else{s.classList.add('active');f.classList.remove('active');}}

/* ============================================================
   STEAM INVENTORY — тільки трейдабельні скіни, ціни з Firestore
   ============================================================ */
async function loadSteamInventory(appId){
    _steamAppId=appId;
    var loadEl=$('invLoading');
    var errEl=$('invError');
    var emptyEl=$('invEmpty');
    var grid=$('steamInvGrid');
    var summary=$('tradeSummary');
    if(!grid)return;
    grid.innerHTML='';
    if(errEl)errEl.style.display='none';
    if(emptyEl)emptyEl.style.display='none';
    if(loadEl)loadEl.style.display='block';
    if(summary)summary.style.display='none';
    var cacheKey='inv_'+_steamId+'_'+appId;
    var cached=null;
    try{
        var c=sessionStorage.getItem(cacheKey);
        if(c){var parsed=JSON.parse(c);if(parsed.time&&(Date.now()-parsed.time)<5*60*1000){cached=parsed.data;}}
    }catch(e){}
    if(cached){
        if(loadEl)loadEl.style.display='none';
        processInventory(cached);
        return;
    }
    _steamInv=[];
    _steamSelected={};
    _invPage=1;
    updateTradeSummary();
    var attempts=0;
    var maxAttempts=3;
    async function tryFetch(){
        attempts++;
        try{
            var url='/api/inventory?steamid='+_steamId+'&appid='+appId;
            var r=await fetch(url);
            var data=await r.json();
            if(data.error){
                if(data.private){
                    if(loadEl)loadEl.style.display='none';
                    if(errEl){
                        errEl.style.display='block';
                        errEl.innerHTML='<div style="font-size:2.5rem;margin-bottom:12px">🔒</div><div style="color:var(--text-dim);line-height:1.6">Инвентарь приватный.<br>Зайди в Steam → Настройки → Конфиденциальность → <b>Инвентарь: Открытый</b>.</div>';
                    }
                    return;
                }
                if(attempts<maxAttempts){
                    if(loadEl)loadEl.innerHTML='Загрузка... попытка '+attempts+' из '+maxAttempts;
                    setTimeout(tryFetch,3000);
                    return;
                }
                if(loadEl)loadEl.style.display='none';
                if(errEl){
                    errEl.style.display='block';
                    errEl.innerHTML='<div style="color:var(--red)">Steam не отвечает.<br>Подожди минуту и нажми «Обновить».</div>';
                }
                return;
            }
            try{sessionStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),data:data}));}catch(e){}
            if(loadEl)loadEl.style.display='none';
            processInventory(data);
        }catch(e){
            console.error('loadSteamInventory error:',e);
            if(attempts<maxAttempts){
                if(loadEl)loadEl.innerHTML='Загрузка... попытка '+attempts+' из '+maxAttempts;
                setTimeout(tryFetch,3000);
                return;
            }
            if(loadEl)loadEl.style.display='none';
            if(errEl){
                errEl.style.display='block';
                errEl.innerHTML='<div style="color:var(--red)">Ошибка: '+e.message+'<br>Попробуй ещё раз через минуту.</div>';
            }
        }
    }
    tryFetch();
}

function processInventory(data){
    var emptyEl=$('invEmpty');
    var grid=$('steamInvGrid');
    if(!grid)return;
    if(!data.assets||data.assets.length===0){
        if(emptyEl)emptyEl.style.display='block';
        return;
    }
    var descMap={};
    data.descriptions.forEach(function(d){descMap[d.classid+'_'+d.instanceid]=d;});
    _steamInv=data.assets.map(function(a){
        var desc=descMap[a.classid+'_'+a.instanceid]||{};
        return{
            assetid:a.assetid,
            classid:a.classid,
            instanceid:a.instanceid,
            name:desc.market_hash_name||desc.name||'Unknown',
            icon:'https://community.cloudflare.steamstatic.com/economy/image/'+desc.icon_url,
            tradable:desc.tradable===1,
            marketable:desc.marketable===1,
            type:desc.type||''
        };
    }).filter(function(i){
        // ✅ Тільки трейдабельні
        if(!i.tradable) return false;
        if(!i.icon || i.icon.indexOf('undefined') >= 0) return false;
        return true;
    });
    if(_steamInv.length===0){
        if(emptyEl){
            emptyEl.style.display='block';
            emptyEl.innerHTML='Нет предметов, доступных для трейда.<br><br>Все предметы либо не трейдабельны, либо на trade hold.';
        }
        return;
    }
    _invPage=1;
    renderSteamInv();
}

function renderSteamInv(){
    var grid=$('steamInvGrid');
    if(!grid)return;
    grid.innerHTML='';
    var fr=document.createDocumentFragment();
    var total=_steamInv.length;
    var shown=Math.min(_invPage*_invPageSize,total);
    
    function makeItem(item){
        var e=document.createElement('div');
        e.className='inv-item';
        var selected=!!_steamSelected[item.assetid];
        var price = _findSkinPrice(item.name);
        
        e.style.border='2px solid '+(selected?'#f5c542':'var(--border)');
        e.style.background=selected?'rgba(245,197,66,0.1)':'rgba(0,0,0,0.4)';
        e.style.cursor='pointer';
        e.style.transition='all 0.2s';
        e.style.borderRadius='12px';
        e.style.padding='10px 8px';
        e.style.textAlign='center';
        e.style.position='relative';
        
        var priceHtml = '';
        if(price > 0){
            priceHtml = '<div style="font-size:0.75rem;color:#f5c542;font-weight:700;margin-top:4px">'+formatRastr(price)+'</div>';
        }else{
            priceHtml = '<div style="font-size:0.6rem;color:#6a6a80;margin-top:4px">—</div>';
        }
        
        var badgeHtml = selected ? '<div style="position:absolute;top:6px;right:6px;background:#f5c542;color:#000;font-size:0.6rem;font-weight:900;padding:2px 6px;border-radius:4px">✓</div>' : '';
        
        e.innerHTML=badgeHtml+'<img src="'+item.icon+'" style="width:80px;height:80px;object-fit:contain;margin:0 auto 6px;display:block" loading="lazy"><div style="font-weight:700;font-size:0.65rem;color:#fff;line-height:1.2;text-transform:uppercase;min-height:2.4em;overflow:hidden">'+item.name+'</div>'+priceHtml+'<div style="font-size:0.6rem;color:#6a6a80;margin-top:4px">'+(selected?'✅ ВЫБРАНО':'Нажми')+'</div>';
        
        e.addEventListener('click',function(){
            if(_steamSelected[item.assetid]){
                delete _steamSelected[item.assetid];
            }else{
                _steamSelected[item.assetid]=item;
            }
            _ck();
            renderSteamInv();
            updateTradeSummary();
        });
        return e;
    }
    
    for(var i=0;i<shown;i++){
        fr.appendChild(makeItem(_steamInv[i]));
    }
    
    if(shown<total){
        var more=document.createElement('button');
        more.className='btn-secondary';
        more.textContent='Показать ещё 50 ('+(total-shown)+' осталось)';
        more.style.gridColumn='1/-1';
        more.style.marginTop='10px';
        more.addEventListener('click',function(){_invPage++;renderSteamInv();});
        fr.appendChild(more);
        var all=document.createElement('button');
        all.className='btn-secondary';
        all.textContent='Показать ВСЕ ('+total+')';
        all.style.gridColumn='1/-1';
        all.style.marginTop='10px';
        all.addEventListener('click',function(){_invPage=Math.ceil(total/_invPageSize)+1;renderSteamInv();});
        fr.appendChild(all);
    }
    if(total>0){
        var counter=document.createElement('div');
        counter.style.gridColumn='1/-1';
        counter.style.textAlign='center';
        counter.style.padding='10px';
        counter.style.color='#6a6a80';
        counter.style.fontSize='0.8rem';
        counter.textContent='Показано '+shown+' из '+total;
        fr.appendChild(counter);
    }
    grid.replaceChildren(fr);
}

function updateTradeSummary(){
    var count=Object.keys(_steamSelected).length;
    var summary=$('tradeSummary');
    var countEl=$('selectedCount');
    var totalEl=$('tradeTotal');
    var btn=$('createTradeBtn');
    if(count===0){if(summary)summary.style.display='none';return;}
    if(summary)summary.style.display='block';
    
    var total = 0;
    Object.values(_steamSelected).forEach(function(item){
        total += _findSkinPrice(item.name);
    });
    
    if(countEl)countEl.textContent=count;
    if(totalEl){
        if(total > 0){
            totalEl.innerHTML = '≈ ' + formatRastr(total);
        }else{
            totalEl.innerHTML = '<span style="color:#ff6b1a;font-size:0.9rem">Цена не определена</span>';
        }
    }
    if(btn)btn.disabled=false;
}

async function createTrade(){
    if(!_CU){_lg('❌ Войди в аккаунт','lose');return;}
    var selected=Object.values(_steamSelected);
    if(selected.length===0){_lg('❌ Выбери скины','lose');return;}
    
    var totalPrice = 0;
    var pricedItems = 0;
    selected.forEach(function(item){
        var p = _findSkinPrice(item.name);
        if(p > 0) pricedItems++;
        totalPrice += p;
    });
    
    try{
        await window.fbAddDoc(
            window.fbCollection(window.fbDb,'trades'),
            {
                uid:_CU.uid,
                steamId:_steamId,
                displayName:_UDN||_CU.displayName||'Игрок',
                steamUrl:'https://steamcommunity.com/profiles/'+_steamId,
                items:selected.map(function(i){return{assetid:i.assetid,classid:i.classid,name:i.name,icon:i.icon};}),
                itemCount:selected.length,
                skinPrice: totalPrice,
                pricedItems: pricedItems,
                status:'pending',
                createdAt:Date.now(),
                expiresAt:Date.now()+(3*24*60*60*1000)
            }
        );
        _lg('✅ Заявка создана! Отправь трейд на ссылку выше','win');
        _steamSelected={};
        renderSteamInv();
        updateTradeSummary();
        renderMyTrades();
        openTradeUrl();
    }catch(e){
        console.error('createTrade error:',e);
        _lg('❌ Ошибка: '+e.message,'lose');
    }
}

function openTradeUrl(){
    var url='https://steamcommunity.com/tradeoffer/new/?partner=1073064847&token=Jjv7evlj';
    window.open(url,'_blank');
}

async function renderMyTrades(){
    var wrap=$('myTrades');
    if(!wrap)return;
    if(!_CU){wrap.innerHTML='<div class="empty-inv" style="padding:30px">Войди в аккаунт</div>';return;}
    try{
        var q=window.fbQuery(window.fbCollection(window.fbDb,'trades'),window.fbWhere('uid','==',_CU.uid));
        var snap=await window.fbGetDocs(q);
        var trades=[];
        snap.forEach(function(d){trades.push(Object.assign({_id:d.id},d.data()));});
        trades.sort(function(a,b){return b.createdAt-a.createdAt;});
        if(trades.length===0){wrap.innerHTML='<div class="empty-inv" style="padding:30px">Заявок пока нет</div>';return;}
        var frag=document.createDocumentFragment();
        trades.forEach(function(t){
            var el=document.createElement('div');
            el.className='trade-item '+t.status;
            var statusText={pending:'ОЖИДАЕТ',confirmed:'ПОДТВЕРЖДЕНО',declined:'ОТКЛОНЕНО',cancelled:'ОТМЕНЕНО'}[t.status]||t.status;
            var itemsInfo=t.itemCount?'Скинов: '+t.itemCount:'Скин: '+(t.skinName||'—');
            var html='';
            html+='<div class="trade-info">';
            html+='<div class="name">'+itemsInfo+'</div>';
            if(t.items&&t.items.length>0){html+='<div style="font-size:0.7rem;color:#6a6a80;margin-top:4px">'+t.items.map(function(i){return i.name;}).join(', ')+'</div>';}
            if(t.skinPrice){html+='<div style="font-size:0.75rem;color:#f5c542;margin-top:4px">💰 '+(typeof formatRastr === 'function' ? formatRastr(t.skinPrice) : t.skinPrice)+'</div>';}
            html+='</div>';
            html+='<div class="trade-status '+t.status+'">'+statusText+'</div>';
            if(t.status==='pending'){html+='<div class="trade-actions"><button data-cancel="'+t._id+'">Отменить</button></div>';}
            el.innerHTML=html;
            if(t.status==='pending'){el.querySelector('[data-cancel]').addEventListener('click',function(){cancelTrade(t._id);});}
            frag.appendChild(el);
        });
        wrap.replaceChildren(frag);
    }catch(e){
        console.error('renderMyTrades error:',e);
        wrap.innerHTML='<div class="empty-inv" style="padding:30px">Ошибка загрузки</div>';
    }
}

async function cancelTrade(tradeId){
    if(!_CU)return;
    if(!confirm('Отменить заявку?'))return;
    try{
        var tradeRef=window.fbDoc(window.fbDb,'trades',tradeId);
        var tradeSnap=await window.fbGetDoc(tradeRef);
        if(!tradeSnap.exists()){_lg('❌ Заявка не найдена','lose');return;}
        var trade=tradeSnap.data();
        if(trade.uid!==_CU.uid){_lg('❌ Это не твоя заявка','lose');return;}
        if(trade.status!=='pending'){_lg('❌ Заявка уже не активна','lose');return;}
        await window.fbDeleteDoc(tradeRef);
        _lg('✅ Заявка отменена','info');
        renderMyTrades();
    }catch(e){console.error('cancelTrade error:',e);_lg('❌ Ошибка: '+e.message,'lose');}
}

async function checkExpiredTrades(){
    if(!_CU)return;
    try{
        var q=window.fbQuery(window.fbCollection(window.fbDb,'trades'),window.fbWhere('uid','==',_CU.uid),window.fbWhere('status','==','pending'));
        var snap=await window.fbGetDocs(q);
        var now=Date.now();
        var expired=[];
        snap.forEach(function(docSnap){
            var trade=docSnap.data();
            if(trade.expiresAt&&now>trade.expiresAt){expired.push({id:docSnap.id,data:trade});}
        });
        for(var i=0;i<expired.length;i++){
            await window.fbDeleteDoc(window.fbDoc(window.fbDb,'trades',expired[i].id));
            _lg('⏰ Заявка истекла','info');
        }
        if(expired.length>0)renderMyTrades();
    }catch(e){console.error('checkExpiredTrades error:',e);}
}

function _ah(){
    var ub=$('userBadge');if(ub)ub.addEventListener('click',function(){if(_CU)_ol();else _oa();});
    var lc=$('logoutConfirm');if(lc)lc.addEventListener('click',_lo);
    var lx=$('logoutCancel');if(lx)lx.addEventListener('click',function(){_ck();_cl();});
    var ss=$('speedSlowBtn');if(ss)ss.addEventListener('click',function(){_un();_ck();state.spinSpeed='slow';_usb();save();});
    var sf=$('speedFastBtn');if(sf)sf.addEventListener('click',function(){_un();_ck();state.spinSpeed='fast';_usb();save();});
    var rc=$('resultContinue');if(rc)rc.addEventListener('click',_cr);
    var sb=$('soundBtn');if(sb)sb.addEventListener('click',function(){state.soundOn=!state.soundOn;$('soundIcon').textContent=state.soundOn?'🔊':'🔇';if(state.soundOn){_un();_ck();}save();});
    var bc=$('buyCancel');if(bc)bc.addEventListener('click',function(){_ck();$('buyModal').classList.remove('show');_pp=null;_pq=1;});
    var bcf=$('buyConfirm');if(bcf)bcf.addEventListener('click',function(){if(!_pp)return;var sk=_pp.skin;var up=_pp.price;var q=_pq||1;var tp=up*q;if(state.balance<tp){var mq=Math.floor(state.balance/up);if(mq<=0){_lg('❌ Недостаточно средств','lose');_ck();return;}q=mq;tp=up*q;_lg('⚠️ Хватило только на x'+q,'info');}state.balance-=tp;for(var i=0;i<q;i++)state.inventory.push(sk);state.purchases+=q;state.totalLost+=tp;state.profit-=tp;state.housePlayerLost+=tp;_xp(10*q);_by();_lg('🛒 Куплено: '+sk.name+' x'+q+' за '+formatRastr(tp),'win');$('buyModal').classList.remove('show');_pp=null;_pq=1;_ui();_rsh();_rinv();_ri();save();});
    var sa=$('sellAllBtn');if(sa)sa.addEventListener('click',function(){if(state.inventory.length===0)return;var t=state.inventory.reduce(function(s,i){return s+_a1(i);},0);state.balance+=t;state.inventory=[];_rz();_ui();_rinv();_ri();_by();_lg('💰 Продано: +'+formatRastr(t),'win');save();});
    var ub2=$('upgradeBtn');if(ub2)ub2.addEventListener('click',_hu);
    var ss2=$('sourceSlot');if(ss2)ss2.addEventListener('click',function(){if(state.upgradeSource)return;_un();_ck();var p=document.querySelector('.upg-inv-panel');if(p)p.scrollIntoView({behavior:'smooth',block:'center'});});
    var ts2=$('targetSlot');if(ts2)ts2.addEventListener('click',function(){if(state.upgradeTarget)return;_un();_ck();var p=document.querySelector('.upg-items-panel');if(p)p.scrollIntoView({behavior:'smooth',block:'center'});});
    var sr=$('sourceRemoveBtn');if(sr)sr.addEventListener('click',function(e){e.stopPropagation();_un();_ck();_rz();});
    var tr=$('targetRemoveBtn');if(tr)tr.addEventListener('click',function(e){e.stopPropagation();_un();_ck();state.upgradeTarget=null;state.selectedPreset=null;_rt1();_rp1();_uc();});
    var is=$('invSearch');if(is)is.addEventListener('input',_ri);
    var its=$('itemsSearch');if(its)its.addEventListener('input',_rt2);
    var so=$('shopSort');if(so)so.addEventListener('change',function(e){state.shopSort=e.target.value;_sv=20;_rsh();save();_ck();});
    document.querySelectorAll('.shop-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();
        if(b.dataset.game){document.querySelectorAll('.shop-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');loadSteamInventory(b.dataset.game);return;}
        document.querySelectorAll('.shop-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');state.shopFilter=b.dataset.rarity;_sv=20;_rsh();save();});});
    document.querySelectorAll('.inv-filter').forEach(function(b){b.addEventListener('click',function(){_un();_ck();document.querySelectorAll('.inv-filter').forEach(function(x){x.classList.remove('active');});b.classList.add('active');_ivf=b.dataset.rarity;_rinv();});});
    document.querySelectorAll('.nav-tab').forEach(function(t){t.addEventListener('click',function(){_un();_ck();_sl();document.querySelectorAll('.nav-tab').forEach(function(x){x.classList.remove('active');});document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});t.classList.add('active');$('page-'+t.dataset.page).classList.add('active');if(t.dataset.page==='shop'){_sv=20;_rsh();}if(t.dataset.page==='inventory')_rinv();if(t.dataset.page==='trade'){renderMyTrades();}if(t.dataset.page==='upgrade'){_ri();_rt2();}});});
    document.addEventListener('visibilitychange',function(){if(document.hidden)_sl();});
    document.body.addEventListener('click',function(){_un();},{once:true});
    var stb=$('steamLoginBtn');if(stb)stb.addEventListener('click',function(){window.location.href='/api/steam';});
    var tlb=$('tradeLoginBtn');if(tlb)tlb.addEventListener('click',function(){window.location.href='/api/steam';});
    var rib=$('reloadInvBtn');if(rib)rib.addEventListener('click',function(){_ck();loadSteamInventory(_steamAppId);});
    var ctb=$('createTradeBtn');if(ctb)ctb.addEventListener('click',createTrade);
}

function _checkSteamToken(){
    var p=new URLSearchParams(window.location.search);
    var t=p.get('steam_token');
    if(!t)return false;
    window.history.replaceState({},document.title,window.location.pathname);
    if(window.fbSignInWithCustomToken&&window.fbAuth){
        window.fbSignInWithCustomToken(window.fbAuth,t)
            .then(function(c){console.log('Steam OK',c.user.uid);})
            .catch(function(e){console.error('Steam err',e.message);alert('Ошибка входа: '+e.message);});
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
    _ipf('invPanelFilters','invPanelFilter',_ri);
    _ipf('itemsPanelFilters','itemsPanelFilter',_rt2);
    var sf=document.querySelector('.shop-filter[data-rarity="'+state.shopFilter+'"]');
    if(sf){document.querySelectorAll('.shop-filter').forEach(function(b){b.classList.remove('active');});sf.classList.add('active');}
    if($('shopSort'))$('shopSort').value=state.shopSort;
    if($('soundIcon'))$('soundIcon').textContent=state.soundOn?'🔊':'🔇';
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
window.createTrade=createTrade;
window.cancelTrade=cancelTrade;
window.renderMyTrades=renderMyTrades;
window.loadSteamInventory=loadSteamInventory;
window.checkExpiredTrades=checkExpiredTrades;
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
