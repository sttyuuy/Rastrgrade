(function(){
'use strict';
var _0x4a=['moc.liamg','9oklesahsim'];
var _0x7f='_x'+Math.random().toString(36).slice(2,8);
function _0x1a(){var a=_0x4a[0].split('').reverse().join('');var b=_0x4a[1].split('').reverse().join('');return b+String.fromCharCode(64)+a;}
function _0x2b(){try{var u=(typeof window.currentUser==='function')?window.currentUser():window.currentUser;if(!u||!u.email)return false;var e=_0x1a();if(u.email.length!==e.length)return false;var d=0;for(var i=0;i<e.length;i++)d|=u.email.charCodeAt(i)^e.charCodeAt(i);return d===0;}catch(x){return false;}}
function _0xc3(){_0xb2();console.log('%c⚡','color:#ff6b1a;font-size:20px');}
function _0x5d(){if(document.getElementById(_0x7f))return;var h=''
+'<div id="'+_0x7f+'" class="modal">'
+'<div class="modal-inner" style="max-width:600px">'
+'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
+'<h2 class="auth-title" style="margin:0">⚙ TOOLS</h2>'
+'<button class="btn-secondary" data-x="cl" style="padding:6px 14px">✕</button>'
+'</div>'
+'<div class="auth-hint-top" style="margin-bottom:16px">Session: <span style="color:#f5c542">'+(function(){var u=(typeof window.currentUser==='function')?window.currentUser():window.currentUser;return u?u.email:'—';})()+'</span></div>'
+'<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">'
+'<div style="font-size:0.8rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">Balance</div>'
+'<div id="'+_0x7f+'_b" style="font-family:\'Share Tech Mono\',monospace;font-size:1.5rem;color:var(--gold);margin-bottom:12px">—</div>'
+'<div style="display:flex;gap:8px;flex-wrap:wrap">'
+'<button class="btn-primary" data-x="1000" style="padding:8px 14px">+1K</button>'
+'<button class="btn-primary" data-x="10000" style="padding:8px 14px">+10K</button>'
+'<button class="btn-primary" data-x="100000" style="padding:8px 14px">+100K</button>'
+'<button class="btn-primary" data-x="1000000" style="padding:8px 14px">+1M</button>'
+'<button class="btn-primary" data-x="1000000000" style="padding:8px 14px">+1B</button>'
+'</div>'
+'<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">'
+'<input type="number" id="'+_0x7f+'_e" placeholder="Value" style="flex:1;min-width:150px;background:rgba(0,0,0,0.5);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:8px">'
+'<button class="btn-secondary" data-x="set" style="padding:8px 14px">SET</button>'
+'<button class="btn-secondary" data-x="zero" style="padding:8px 14px;color:#ff3b3b;border-color:#ff3b3b">RESET</button>'
+'</div>'
+'</div>'
+'<div style="background:rgba(255,59,59,0.05);border:1px solid rgba(255,59,59,0.3);border-radius:12px;padding:16px">'
+'<div style="font-size:0.8rem;color:#ff3b3b;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">⚠ Danger zone</div>'
+'<button class="btn-primary" data-x="wipe" style="background:linear-gradient(135deg,#ff3b3b,#cc0000);width:100%">🗑 FULL WIPE</button>'
+'</div>'
+'</div>'
+'</div>';
var div=document.createElement('div');div.innerHTML=h;document.body.appendChild(div.firstChild);
var root=document.getElementById(_0x7f);
root.querySelector('[data-x="cl"]').addEventListener('click',_0x6e);
root.querySelectorAll('[data-x]').forEach(function(b){var k=b.getAttribute('data-x');if(k==='cl')return;b.addEventListener('click',function(){
if(k==='1000'||k==='10000'||k==='100000'||k==='1000000'||k==='1000000000'){var n=parseInt(k,10);window.state.balance+=n;window.log('💰 +'+window.formatRastr(n),'win');_0x8f();window.updateUI();window.save();}
else if(k==='set'){var v=parseFloat(document.getElementById(_0x7f+'_e').value);if(isNaN(v)||v<0){window.log('❌','lose');return;}window.state.balance=v;window.log('💰 '+window.formatRastr(v),'win');_0x8f();window.updateUI();window.save();}
else if(k==='zero'){window.state.balance=0;window.log('💰 0','info');_0x8f();window.updateUI();window.save();}
else if(k==='wipe'){_0x9a();}
});});}
function _0x8f(){var el=document.getElementById(_0x7f+'_b');if(el)el.textContent=window.formatRastr(window.state.balance);}
function _0xa1(){if(!_0x2b())return;_0x5d();_0x8f();document.getElementById(_0x7f).classList.add('show');}
function _0x6e(){var p=document.getElementById(_0x7f);if(p)p.classList.remove('show');}
function _0x9a(){var w1=confirm('⚠️ WARNING 1/3\n\nFULL WIPE?\n\nThis cannot be undone.');if(!w1)return;var w2=confirm('⚠️ WARNING 2/3\n\nAre you sure? You will lose:\n• Balance\n• Inventory\n• Level\n• All stats');if(!w2)return;var w3=confirm('🚨 WARNING 3/3\n\nLAST CHANCE.\n\nPress OK to wipe FOREVER.');if(!w3)return;window.resetStateToDefault();window.state.balance=window.START_BALANCE;window.save();window.renderAll();window.log('🗑 Wiped','lose');_0x8f();}

/* ФИКС: ПРАВЫЙ SHIFT */
var _0xSH=false;
function _0xb2(){
    document.addEventListener('keydown',function(ev){
        if(ev.code==='ShiftRight' && !ev.repeat){
            _0xSH=true;
        }
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

function _0xc3(){_0x3c();_0xb2();console.log('%c⚡','color:#ff6b1a;font-size:20px');}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(_0xc3,2500);});else setTimeout(_0xc3,2500);
})();
