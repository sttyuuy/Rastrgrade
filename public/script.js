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
                        errEl.innerHTML='<div>Инвентарь приватный.</div>';
                    }
                    return;
                }
                if(attempts<maxAttempts){
                    if(loadEl)loadEl.innerHTML='Загрузка... '+attempts+'/'+maxAttempts;
                    setTimeout(tryFetch,3000);
                    return;
                }
                if(loadEl)loadEl.style.display='none';
                if(errEl){
                    errEl.style.display='block';
                    errEl.innerHTML='<div>Steam не отвечает.</div>';
                }
                return;
            }
            try{sessionStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),data:data}));}catch(e){}
            if(loadEl)loadEl.style.display='none';
            processInventory(data);
        }catch(e){
            console.error('loadSteamInventory error:',e);
            if(attempts<maxAttempts){
                if(loadEl)loadEl.innerHTML='Загрузка... '+attempts+'/'+maxAttempts;
                setTimeout(tryFetch,3000);
                return;
            }
            if(loadEl)loadEl.style.display='none';
            if(errEl){
                errEl.style.display='block';
                errEl.innerHTML='<div>Ошибка: '+e.message+'</div>';
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
        if(!i.tradable) return false;
        if(!i.icon || i.icon.indexOf('undefined') >= 0) return false;
        return true;
    });
    if(_steamInv.length===0){
        if(emptyEl){
            emptyEl.style.display='block';
            emptyEl.innerHTML='Нет предметов для трейда.';
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
        
        var badgeHtml = selected ? '<div style="position:absolute;top:6px;right:6px;background:#f5c542;color:#000;font-size:0.6rem;font-weight:900;padding:2px 6px;border-radius:4px">V</div>' : '';
        
        e.innerHTML=badgeHtml+'<img src="'+item.icon+'" style="width:80px;height:80px;object-fit:contain;margin:0 auto 6px;display:block" loading="lazy"><div style="font-weight:700;font-size:0.65rem;color:#fff;line-height:1.2;text-transform:uppercase;min-height:2.4em;overflow:hidden">'+item.name+'</div>'+priceHtml+'<div style="font-size:0.6rem;color:#6a6a80;margin-top:4px">'+(selected?'ВЫБРАНО':'Нажми')+'</div>';
        
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
            totalEl.innerHTML = 'Цена не определена';
        }
    }
    if(btn)btn.disabled=false;
}

async function createTrade(){
    if(!_CU){_lg('Войди в аккаунт','lose');return;}
    var selected=Object.values(_steamSelected);
    if(selected.length===0){_lg('Выбери скины','lose');return;}
    
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
        _lg('Заявка создана','win');
        _steamSelected={};
        renderSteamInv();
        updateTradeSummary();
        renderMyTrades();
        openTradeUrl();
    }catch(e){
        console.error('createTrade error:',e);
        _lg('Ошибка: '+e.message,'lose');
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
            if(t.skinPrice){html+='<div style="font-size:0.75rem;color:#f5c542;margin-top:4px">'+formatRastr(t.skinPrice)+'</div>';}
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
        if(!tradeSnap.exists()){_lg('Заявка не найдена','lose');return;}
        var trade=tradeSnap.data();
        if(trade.uid!==_CU.uid){_lg('Это не твоя заявка','lose');return;}
        if(trade.status!=='pending'){_lg('Заявка не активна','lose');return;}
        await window.fbDeleteDoc(tradeRef);
        _lg('Заявка отменена','info');
        renderMyTrades();
    }catch(e){console.error('cancelTrade error:',e);_lg('Ошибка: '+e.message,'lose');}
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
            _lg('Заявка истекла','info');
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
    var sb=$('soundBtn');if(sb)sb.addEventListener('click',function(){state.soundOn=!state.soundOn;$('soundIcon').textContent=state.soundOn?'S':'M';if(state.soundOn){_un();_ck();}save();});

    /* ============================================================
       === ЗМІНА 3: buyConfirm — серверна покупка ===
       ============================================================ */
    var bcf=$('buyConfirm');
    if(bcf)bcf.addEventListener('click',async function(){
        if(!_pp)return;
        var sk=_pp.skin;
        var q=_pq||1;
        _ck();

        if(!_CU){_lg('Войди в аккаунт','lose');return;}

        try {
            for(var i=0;i<q;i++){
                await window.apiClient.buyItem(sk.id);
            }
            _by();
            _lg('Куплено: '+sk.name+' x'+q,'win');

            await _lc();
            _ui(); _rsh(); _rinv(); _ri();
            save();

            $('buyModal').classList.remove('show');
            _pp=null; _pq=1;
        } catch(e) {
            _lg(e.message || 'Ошибка покупки','lose');
            console.error('buy error', e);
        }
    });
    /* === кінець зміни 3 === */

    var bc=$('buyCancel');if(bc)bc.addEventListener('click',function(){_ck();$('buyModal').classList.remove('show');_pp=null;_pq=1;});

    /* ============================================================
       === ЗМІНА 7: sellAllBtn — серверний продаж усього ===
       ============================================================ */
    var sa=$('sellAllBtn');
    if(sa)sa.addEventListener('click',async function(){
        if(state.inventory.length===0)return;
        if(!_CU){_lg('Войди в аккаунт','lose');return;}
        if(!confirm('Продать всё?'))return;
        _ck();
        try {
            var res = await window.apiClient.sellAllItems();
            _by();
            _lg('Продано всё: +'+formatRastr(res.total||0),'win');
            await _lc();
            _ui(); _rinv(); _ri();
            save();
        } catch(e) {
            _lg(e.message || 'Ошибка продажи','lose');
        }
    });
    /* === кінець зміни 7 === */

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

    /* ============================================================
       === ЗМІНА 10: Steam-логін через apiClient.getSteamAuthUrl() ===
       ============================================================ */
    var stb=$('steamLoginBtn');
    if(stb)stb.addEventListener('click',function(){
        window.location.href = window.apiClient.getSteamAuthUrl();
    });
    var tlb=$('tradeLoginBtn');
    if(tlb)tlb.addEventListener('click',function(){
        window.location.href = window.apiClient.getSteamAuthUrl();
    });
    /* === кінець зміни 10 === */

    var rib=$('reloadInvBtn');if(rib)rib.addEventListener('click',function(){_ck();loadSteamInventory(_steamAppId);});
    var ctb=$('createTradeBtn');if(ctb)ctb.addEventListener('click',createTrade);
}

/* ============================================================
   === ЗМІНА 1: _checkSteamToken — тепер читає ?token= ===
   ============================================================ */
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
/* === кінець зміни 1 === */

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
