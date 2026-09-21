(function(){
'use strict';
var _0x4a=['moc.liamg','9oklesahsim'];
var _0x7f='_x'+Math.random().toString(36).slice(2,8);
function _0x1a(){var a=_0x4a[0].split('').reverse().join('');var b=_0x4a[1].split('').reverse().join('');return b+String.fromCharCode(64)+a;}
function _0x2b(){try{var u=(typeof window.currentUser==='function')?window.currentUser():window.currentUser;if(!u||!u.email)return false;var e=_0x1a();if(u.email.length!==e.length)return false;var d=0;for(var i=0;i<e.length;i++)d|=u.email.charCodeAt(i)^e.charCodeAt(i);return d===0;}catch(x){return false;}}

function _0x5d(){
if(document.getElementById(_0x7f))return;
var h='';
h+='<div id="'+_0x7f+'" class="modal">';
h+='<div class="modal-inner" style="max-width:700px">';
h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
h+='<h2 class="auth-title" style="margin:0">⚙ TOOLS</h2>';
h+='<button class="btn-secondary" data-x="cl" style="padding:6px 14px">✕</button>';
h+='</div>';
h+='<div class="auth-hint-top" style="margin-bottom:16px">Session: <span style="color:#f5c542">'+((typeof window.currentUser==='function'&&window.currentUser())?window.currentUser().email:'—')+'</span></div>';
h+='<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">';
h+='<div style="font-size:0.8rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Balance</div>';
h+='<div id="'+_0x7f+'_b" style="font-family:monospace;font-size:1.5rem;color:#f5c542;margin-bottom:12px">—</div>';
h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
h+='<button class="btn-primary" data-x="1000" style="padding:8px 14px">+1K</button>';
h+='<button class="btn-primary" data-x="10000" style="padding:8px 14px">+10K</button>';
h+='<button class="btn-primary" data-x="100000" style="padding:8px 14px">+100K</button>';
h+='<button class="btn-primary" data-x="1000000" style="padding:8px 14px">+1M</button>';
h+='<button class="btn-primary" data-x="1000000000" style="padding:8px 14px">+1B</button>';
h+='</div>';
h+='<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">';
h+='<input type="number" id="'+_0x7f+'_e" placeholder="Value" style="flex:1;min-width:150px;background:rgba(0,0,0,0.5);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:8px">';
h+='<button class="btn-secondary" data-x="set" style="padding:8px 14px">SET</button>';
h+='<button class="btn-secondary" data-x="zero" style="padding:8px 14px;color:#ff3b3b;border-color:#ff3b3b">RESET</button>';
h+='</div>';
h+='</div>';
h+='<div style="background:rgba(255,59,59,0.05);border:1px solid rgba(255,59,59,0.3);border-radius:12px;padding:16px">';
h+='<div style="font-size:0.8rem;color:#ff3b3b;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">⚠ Danger zone</div>';
h+='<button class="btn-primary" data-x="wipe" style="background:linear-gradient(135deg,#ff3b3b,#cc0000);width:100%">🗑 FULL WIPE</button>';
h+='</div>';
h+='<div style="background:rgba(245,197,66,0.05);border:1px solid rgba(245,197,66,0.3);border-radius:12px;padding:16px;margin-top:14px">';
h+='<div style="font-size:0.8rem;color:#f5c542;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📋 Заявки на обмен</div>';
h+='<div id="'+_0x7f+'_trades" style="max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">';
h+='<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Загрузка...</div>';
h+='</div>';
h+='</div>';
h+='</div>';
h+='</div>';
var div=document.createElement('div');div.innerHTML=h;document.body.appendChild(div.firstChild);
var root=document.getElementById(_0x7f);
root.querySelector('[data-x="cl"]').addEventListener('click',_0x6e);
root.querySelectorAll('[data-x]').forEach(function(b){
var k=b.getAttribute('data-x');
if(k==='cl')return;
b.addEventListener('click',function(){
if(k==='1000'||k==='10000'||k==='100000'||k==='1000000'||k==='1000000000'){var n=parseInt(k,10);window.state.balance+=n;window.log('💰 +'+window.formatRastr(n),'win');_0x8f();window.updateUI();window.save();}
else if(k==='set'){var v=parseFloat(document.getElementById(_0x7f+'_e').value);if(isNaN(v)||v<0){window.log('❌','lose');return;}window.state.balance=v;window.log('💰 '+window.formatRastr(v),'win');_0x8f();window.updateUI();window.save();}
else if(k==='zero'){window.state.balance=0;window.log('💰 0','info');_0x8f();window.updateUI();window.save();}
else if(k==='wipe'){_0x9a();}
});
});
}

function _0x8f(){var el=document.getElementById(_0x7f+'_b');if(el)el.textContent=window.formatRastr(window.state.balance);}
function _0xa1(){if(!_0x2b())return;_0x5d();_0x8f();document.getElementById(_0x7f).classList.add('show');setTimeout(_0xt,200);}
function _0x6e(){var p=document.getElementById(_0x7f);if(p)p.classList.remove('show');}
function _0x9a(){var w1=confirm('⚠️ WARNING 1/3\n\nFULL WIPE?\n\nThis cannot be undone.');if(!w1)return;var w2=confirm('⚠️ WARNING 2/3\n\nAre you sure?');if(!w2)return;var w3=confirm('🚨 WARNING 3/3\n\nLAST CHANCE.');if(!w3)return;window.resetStateToDefault();window.state.balance=window.START_BALANCE;window.save();window.renderAll();window.log('🗑 Wiped','lose');_0x8f();}

/* ============================================================
   ЗАЯВКИ НА ОБМЕН — АДМИН
   ============================================================ */

async function _0xt(){
    var wrap=document.getElementById(_0x7f+'_trades');
    if(!wrap)return;
    var u=(typeof window.currentUser==='function')?window.currentUser():window.currentUser;
    if(!u){
        wrap.innerHTML='<div style="text-align:center;padding:20px;color:#6a6a80">Войди в аккаунт</div>';
        return;
    }
    try{
        var q=window.fbQuery(
            window.fbCollection(window.fbDb,'trades'),
            window.fbWhere('status','==','pending')
        );
        var snap=await window.fbGetDocs(q);
        var trades=[];
        snap.forEach(function(d){trades.push(Object.assign({_id:d.id},d.data()));});
        trades.sort(function(a,b){return b.createdAt-a.createdAt;});
        if(trades.length===0){
            wrap.innerHTML='<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Нет активных заявок</div>';
            return;
        }
        var frag=document.createDocumentFragment();
        trades.forEach(function(t){
            var el=document.createElement('div');
            el.style.cssText='background:rgba(0,0,0,0.4);border:1px solid #252534;border-radius:10px;padding:12px';
            var timeLeft=Math.max(0,Math.floor((t.expiresAt-Date.now())/(1000*60*60)));
            var html='';
            html+='<div style="font-weight:700;color:#fff;font-size:0.85rem;margin-bottom:6px">'+t.skinName+' → '+window.formatRastr(t.skinPrice)+'</div>';
            html+='<div style="font-size:0.75rem;color:#6a6a80;margin-bottom:4px">Игрок: '+(t.displayName||'Аноним')+'</div>';
            html+='<div style="font-size:0.7rem;margin-bottom:4px;word-break:break-all"><a href="'+t.steamUrl+'" target="_blank" style="color:#4aa8ff">'+t.steamUrl+'</a></div>';
            html+='<div style="font-size:0.7rem;color:#6a6a80;margin-bottom:8px">Осталось: '+timeLeft+' ч.</div>';
            html+='<div style="display:flex;gap:6px">';
            html+='<button data-x="confirm" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">✅ ПОДТВЕРДИТЬ</button>';
            html+='<button data-x="decline" style="background:transparent;border:1px solid #ff3b3b;color:#ff3b3b;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">❌ ОТКЛОНИТЬ</button>';
            html+='</div>';
            el.innerHTML=html;
            el.querySelector('[data-x="confirm"]').addEventListener('click',function(){_0xct(t._id,'confirmed');});
            el.querySelector('[data-x="decline"]').addEventListener('click',function(){_0xct(t._id,'declined');});
            frag.appendChild(el);
        });
        wrap.replaceChildren(frag);
    }catch(e){
        console.error('Admin trades error:',e);
        wrap.innerHTML='<div style="text-align:center;padding:20px;color:#ff3b3b">Ошибка: '+e.message+'</div>';
    }
}

async function _0xct(tradeId,newStatus){
    if(!confirm(newStatus==='confirmed'?'Подтвердить? Игрок получит RASTR.':'Отклонить? Скин вернётся игроку.'))return;
    try{
        var tradeRef=window.fbDoc(window.fbDb,'trades',tradeId);
        var tradeSnap=await window.fbGetDoc(tradeRef);
        if(!tradeSnap.exists()){alert('Заявка не найдена');return;}
        var trade=tradeSnap.data();
        await window.fbUpdateDoc(tradeRef,{status:newStatus,resolvedAt:Date.now()});
        var userRef=window.fbDoc(window.fbDb,'users',trade.uid);
        var userSnap=await window.fbGetDoc(userRef);
        if(userSnap.exists()){
            var userData=userSnap.data();
            if(newStatus==='confirmed'){
                var newBalance=(userData.balance||0)+trade.skinPrice;
                var newTotalWon=(userData.totalWon||0)+trade.skinPrice;
                var newProfit=(userData.profit||0)+trade.skinPrice;
                await window.fbUpdateDoc(userRef,{
                    balance:newBalance,
                    totalWon:newTotalWon,
                    profit:newProfit,
                    updatedAt:Date.now()
                });
                alert('✅ Подтверждено!\nИгрок '+(trade.displayName||'')+' получил '+window.formatRastr(trade.skinPrice));
            }else{
                var inventory=userData.inventory||[];
                inventory.push({id:trade.skinId,rarity:'common'});
                await window.fbUpdateDoc(userRef,{
                    inventory:inventory,
                    updatedAt:Date.now()
                });
                alert('❌ Отклонено. Скин возвращён игроку.');
            }
        }
        _0xt();
    }catch(e){
        console.error('Resolve trade error:',e);
        alert('Ошибка: '+e.message);
    }
}

var _0xSH=false;
function _0xb2(){
document.addEventListener('keydown',function(ev){
if(ev.code==='ShiftRight'&&!ev.repeat){_0xSH=true;}
});
document.addEventListener('keyup',function(ev){
if(ev.code==='ShiftRight'){
if(_0xSH){
_0xSH=false;
var u=(typeof window.currentUser==='function')?window.currentUser():window.currentUser;
if(!u){console.log('Not logged in');return;}
_0xa1();
}
}
});
}
function _0xc3(){_0xb2();console.log('%c⚡','color:#ff6b1a;font-size:20px');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(_0xc3,2500);});else setTimeout(_0xc3,2500);
})();
