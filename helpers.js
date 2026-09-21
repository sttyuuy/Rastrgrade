/* ============================================================
   HELPERS.JS — АДМІН-ПАНЕЛЬ + УТИЛІТИ
   ============================================================ */
(function(){
'use strict';

/* ---------- Обфускація ключових імен ---------- */
var _0x7f = 'admin_panel_rastr';
var _0x4a = ['moc.liamg', '9oklesahsim']; // mishaselko9@gmail.com (reversed)

function _0xr(s){
    // reverse string (для перевірки email)
    return s.split('').reverse().join('');
}

/* ---------- Перевірка адміна ---------- */
function _0xAdm(){
    try{
        var u = (typeof window.currentUser === 'function') ? window.currentUser() : window.currentUser;
        if(!u) return false;
        var em = u.email || '';
        var expected = _0xr(_0x4a[1]) + '@' + _0xr(_0x4a[0]); // mishaselko9@gmail.com
        if(em === expected) return true;
        // Додаткова перевірка по UID (якщо треба — впиши свій)
        // if(u.uid === 'ТВОЙ_UID') return true;
        return false;
    }catch(e){ return false; }
}

/* ---------- Відкриття/закриття адмінки ---------- */
var _0xOpen = false;

function _0xToggle(){
    _0xOpen = !_0xOpen;
    var el = document.getElementById(_0x7f);
    if(_0xOpen){
        if(!el){
            el = document.createElement('div');
            el.id = _0x7f;
            el.style.cssText = 'position:fixed;top:0;right:0;width:420px;height:100vh;background:linear-gradient(180deg,#0a0a12,#050508);border-left:1px solid #252534;z-index:99999;overflow-y:auto;padding:20px;box-shadow:-10px 0 40px rgba(0,0,0,0.8);font-family:Rajdhani,sans-serif;color:#c8c8d4';
            document.body.appendChild(el);
        }
        el.style.display = 'block';
        _0xa1();
    }else{
        if(el) el.style.display = 'none';
    }
}

/* ---------- Хоткей: правий Shift ---------- */
document.addEventListener('keydown', function(e){
    if(e.code === 'ShiftRight' && !e.repeat){
        if(!_0xAdm()) return;
        _0xToggle();
    }
});
document.addEventListener('keyup', function(e){
    if(e.code === 'ShiftRight'){}
});

/* ---------- Головна функція рендеру адмінки ---------- */
function _0xa1(){
    var el = document.getElementById(_0x7f);
    if(!el) return;
    var h = '';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">';
    h += '<div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:900;color:#ff6b1a;letter-spacing:2px">⚙ TOOLS</div>';
    h += '<button id="'+_0x7f+'_close" style="background:transparent;border:1px solid #252534;color:#c8c8d4;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1rem">✕</button>';
    h += '</div>';

    /* --- Блок: баланс гравця --- */
    h += '<div style="background:rgba(255,107,26,0.05);border:1px solid rgba(255,107,26,0.3);border-radius:12px;padding:16px;margin-bottom:14px">';
    h += '<div style="font-size:0.8rem;color:#ff6b1a;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">💰 Баланс</div>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    h += '<button data-bal="1000" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:8px;font-family:inherit;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">+1K</button>';
    h += '<button data-bal="5000" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:8px;font-family:inherit;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">+5K</button>';
    h += '<button data-bal="50000" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:8px;font-family:inherit;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">+50K</button>';
    h += '<button data-bal="reset" style="flex:1;background:linear-gradient(135deg,#ff3b3b,#cc0000);border:none;color:#fff;padding:8px;font-family:inherit;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">RESET 5</button>';
    h += '</div></div>';

    /* --- Блок: FULL WIPE --- */
    h += '<div style="background:rgba(255,59,59,0.05);border:1px solid rgba(255,59,59,0.3);border-radius:12px;padding:16px;margin-bottom:14px">';
    h += '<div style="font-size:0.8rem;color:#ff3b3b;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">☠ FULL WIPE</div>';
    h += '<button id="'+_0x7f+'_wipe" style="width:100%;background:linear-gradient(135deg,#ff3b3b,#cc0000);border:none;color:#fff;padding:10px;font-family:inherit;font-size:0.8rem;font-weight:700;border-radius:6px;cursor:pointer">ОБНУЛИТЬ ВСЁ</button>';
    h += '</div>';

    /* --- Блок: статистика --- */
    h += '<div style="background:rgba(74,168,255,0.05);border:1px solid rgba(74,168,255,0.3);border-radius:12px;padding:16px;margin-bottom:14px">';
    h += '<div style="font-size:0.8rem;color:#4aa8ff;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📊 Статистика</div>';
    h += '<div id="'+_0x7f+'_stats" style="font-size:0.8rem;line-height:1.8;color:#c8c8d4">Загрузка...</div>';
    h += '</div>';

    /* --- Блок: заявки на обмен (trades) --- */
    h += '<div style="background:rgba(245,197,66,0.05);border:1px solid rgba(245,197,66,0.3);border-radius:12px;padding:16px;margin-bottom:14px">';
    h += '<div style="font-size:0.8rem;color:#f5c542;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📋 Заявки на обмен</div>';
    h += '<div id="'+_0x7f+'_trades" style="max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">';
    h += '<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Загрузка...</div>';
    h += '</div>';
    h += '</div>';

    /* --- Блок: заявки на вывод (withdrawals) --- */
    h += '<div style="background:rgba(74,168,255,0.05);border:1px solid rgba(74,168,255,0.3);border-radius:12px;padding:16px;margin-top:14px">';
    h += '<div style="font-size:0.8rem;color:#4aa8ff;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px">📤 Заявки на вывод</div>';
    h += '<div id="'+_0x7f+'_withdrawals" style="max-height:400px;overflow-y:auto;display:flex;flex-direction:column;gap:8px">';
    h += '<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Загрузка...</div>';
    h += '</div>';
    h += '</div>';

    el.innerHTML = h;

    /* --- Обробники кнопок --- */
    var closeBtn = document.getElementById(_0x7f+'_close');
    if(closeBtn) closeBtn.addEventListener('click', function(){ _0xToggle(); });

    el.querySelectorAll('[data-bal]').forEach(function(b){
        b.addEventListener('click', function(){
            var v = b.dataset.bal;
            if(v === 'reset'){
                if(!confirm('Обнулить баланс до 5?')) return;
                if(window.state) window.state.balance = 5;
                if(window.updateUI) window.updateUI();
                if(window.save) window.save();
                alert('✅ Баланс обнулён до 5');
            }else{
                var add = parseInt(v,10);
                if(window.state) window.state.balance += add;
                if(window.updateUI) window.updateUI();
                if(window.save) window.save();
                alert('✅ +' + add);
            }
        });
    });

    var wipeBtn = document.getElementById(_0x7f+'_wipe');
    if(wipeBtn) wipeBtn.addEventListener('click', function(){
        if(!confirm('⚠️ ОБНУЛИТЬ ВСЁ? Инвентарь, статистика, XP, уровень — всё сбросится.')) return;
        if(window.resetStateToDefault) window.resetStateToDefault();
        if(window.state) window.state.balance = 5;
        if(window.renderAll) window.renderAll();
        if(window.updateUI) window.updateUI();
        if(window.save) window.save();
        alert('✅ Всё обнулено');
    });

    /* --- Запуск завантаження даних --- */
    setTimeout(_0xt, 200);
    setTimeout(_0xw, 300);
    setTimeout(_0xs, 250);
/* ============================================================
   ЗАЯВКИ НА ОБМЕН (TRADES) — _0xt()
   ============================================================ */
async function _0xt(){
    var wrap = document.getElementById(_0x7f + '_trades');
    if(!wrap) return;
    var u = (typeof window.currentUser === 'function') ? window.currentUser() : window.currentUser;
    if(!u){
        wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#6a6a80">Войди в аккаунт</div>';
        return;
    }
    try{
        var q = window.fbQuery(
            window.fbCollection(window.fbDb, 'trades'),
            window.fbWhere('status', '==', 'pending')
        );
        var snap = await window.fbGetDocs(q);
        var items = [];
        snap.forEach(function(d){ items.push(Object.assign({_id:d.id}, d.data())); });
        items.sort(function(a,b){ return b.createdAt - a.createdAt; });

        if(items.length === 0){
            wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Нет активных заявок</div>';
            return;
        }
        var frag = document.createDocumentFragment();
        items.forEach(function(t){
            var el = document.createElement('div');
            el.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid #252534;border-radius:10px;padding:12px';
            var html = '';
            var title = t.itemCount ? ('Скинов: ' + t.itemCount) : ('Скин: ' + (t.skinName || '—'));
            html += '<div style="font-weight:700;color:#fff;font-size:0.85rem;margin-bottom:6px">' + title + '</div>';
            if(t.items && t.items.length > 0){
                html += '<div style="font-size:0.7rem;color:#6a6a80;margin-bottom:6px;line-height:1.4">' + t.items.map(function(i){ return i.name; }).join(', ') + '</div>';
            }
            html += '<div style="font-size:0.75rem;color:#6a6a80;margin-bottom:4px">Игрок: ' + (t.displayName || 'Аноним') + '</div>';
            if(t.steamUrl){
                html += '<div style="font-size:0.7rem;margin-bottom:8px;word-break:break-all"><a href="' + t.steamUrl + '" target="_blank" style="color:#4aa8ff">' + t.steamUrl + '</a></div>';
            }
            if(t.expiresAt){
                var left = Math.max(0, t.expiresAt - Date.now());
                var hours = Math.floor(left / 3600000);
                html += '<div style="font-size:0.7rem;color:#f5c542;margin-bottom:8px">Осталось: ' + hours + ' ч.</div>';
            }
            html += '<div style="display:flex;gap:6px">';
            html += '<button data-x="confirm" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">✅ ПОДТВЕРДИТЬ</button>';
            html += '<button data-x="decline" style="background:transparent;border:1px solid #ff3b3b;color:#ff3b3b;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">❌ ОТКЛОНИТЬ</button>';
            html += '</div>';
            el.innerHTML = html;
            el.querySelector('[data-x="confirm"]').addEventListener('click', function(){ _0xct(t._id, 'confirmed'); });
            el.querySelector('[data-x="decline"]').addEventListener('click', function(){ _0xct(t._id, 'declined'); });
            frag.appendChild(el);
        });
        wrap.replaceChildren(frag);
    }catch(e){
        console.error('Trades error:', e);
        wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#ff3b3b">Ошибка: ' + e.message + '</div>';
    }
}

async function _0xct(id, action){
    var msg = action === 'confirmed'
        ? 'Подтвердить? Игрок получит RASTR.'
        : 'Отклонить заявку?';
    if(!confirm(msg)) return;
    try{
        var tRef = window.fbDoc(window.fbDb, 'trades', id);
        var tSnap = await window.fbGetDoc(tRef);
        if(!tSnap.exists()){ alert('Заявка не найдена'); return; }
        var t = tSnap.data();

        if(action === 'confirmed'){
            // Начисляем RASTR игроку
            var userRef = window.fbDoc(window.fbDb, 'users', t.uid);
            var userSnap = await window.fbGetDoc(userRef);
            if(userSnap.exists()){
                var ud = userSnap.data();
                var bal = (ud.balance || 0);
                var price = t.skinPrice || 0;
                if(!price && t.items && t.items.length > 0){
                    price = t.items.reduce(function(s,i){ return s + (i.price || 0); }, 0);
                }
                await window.fbUpdateDoc(userRef, {
                    balance: bal + price,
                    totalWon: (ud.totalWon || 0) + price,
                    profit: (ud.profit || 0) + price,
                    updatedAt: Date.now()
                });
            }
            await window.fbUpdateDoc(tRef, { status: 'confirmed', resolvedAt: Date.now() });
            alert('✅ Подтверждено! Игрок получил RASTR');
        }else{
            await window.fbUpdateDoc(tRef, { status: 'declined', resolvedAt: Date.now() });
            alert('❌ Отклонено');
        }
        _0xt();
    }catch(e){
        console.error('Trade resolve error:', e);
        alert('Ошибка: ' + e.message);
    }
}

/* ============================================================
   СТАТИСТИКА — _0xs()
   ============================================================ */
async function _0xs(){
    var wrap = document.getElementById(_0x7f + '_stats');
    if(!wrap) return;
    try{
        var usersSnap = await window.fbGetDocs(window.fbCollection(window.fbDb, 'users'));
        var totalUsers = 0, totalBalance = 0, totalInv = 0;
        usersSnap.forEach(function(d){
            var ud = d.data();
            totalUsers++;
            totalBalance += (ud.balance || 0);
            totalInv += (ud.inventory || []).length;
        });
        var tradesSnap = await window.fbGetDocs(
            window.fbQuery(window.fbCollection(window.fbDb, 'trades'), window.fbWhere('status','==','pending'))
        );
        var pendingTrades = tradesSnap.size;

        var wSnap = await window.fbGetDocs(
            window.fbQuery(window.fbCollection(window.fbDb, 'withdrawals'), window.fbWhere('status','==','pending'))
        );
        var pendingWithdrawals = wSnap.size;

        var html = '';
        html += '👥 Игроков: <b style="color:#fff">' + totalUsers + '</b><br>';
        html += '💰 Общий баланс: <b style="color:#f5c542">' + (typeof window.formatRastr === 'function' ? window.formatRastr(totalBalance) : totalBalance) + '</b><br>';
        html += '🎒 Скинов в инвентарях: <b style="color:#fff">' + totalInv + '</b><br>';
        html += '📋 Заявок на обмен: <b style="color:#f5c542">' + pendingTrades + '</b><br>';
        html += '📤 Заявок на вывод: <b style="color:#4aa8ff">' + pendingWithdrawals + '</b>';
        wrap.innerHTML = html;
    }catch(e){
        console.error('Stats error:', e);
        wrap.innerHTML = '<span style="color:#ff3b3b">Ошибка: ' + e.message + '</span>';
    }
}

/* ============================================================
   ЗАЯВКИ НА ВЫВОД (WITHDRAWALS) — _0xw()
   ============================================================ */
async function _0xw(){
    var wrap = document.getElementById(_0x7f + '_withdrawals');
    if(!wrap) return;
    var u = (typeof window.currentUser === 'function') ? window.currentUser() : window.currentUser;
    if(!u){
        wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#6a6a80">Войди в аккаунт</div>';
        return;
    }
    try{
        var q = window.fbQuery(
            window.fbCollection(window.fbDb, 'withdrawals'),
            window.fbWhere('status', '==', 'pending')
        );
        var snap = await window.fbGetDocs(q);
        var items = [];
        snap.forEach(function(d){ items.push(Object.assign({_id:d.id}, d.data())); });
        items.sort(function(a,b){ return b.createdAt - a.createdAt; });

        if(items.length === 0){
            wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#6a6a80;font-style:italic;font-size:0.85rem">Нет активных заявок</div>';
            return;
        }
        var frag = document.createDocumentFragment();
        items.forEach(function(t){
            var el = document.createElement('div');
            el.style.cssText = 'background:rgba(0,0,0,0.4);border:1px solid #252534;border-radius:10px;padding:12px';
            var html = '';
            html += '<div style="font-weight:700;color:#fff;font-size:0.85rem;margin-bottom:6px">' + t.skinName + ' → ' + window.formatRastr(t.skinPrice) + '</div>';
            html += '<div style="font-size:0.75rem;color:#6a6a80;margin-bottom:4px">Игрок: ' + (t.displayName || 'Аноним') + '</div>';
            html += '<div style="font-size:0.7rem;margin-bottom:8px;word-break:break-all"><a href="' + t.steamUrl + '" target="_blank" style="color:#4aa8ff">' + t.steamUrl + '</a></div>';
            html += '<div style="display:flex;gap:6px">';
            html += '<button data-x="sent" style="flex:1;background:linear-gradient(135deg,#00e676,#00b85c);border:none;color:#000;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">✅ ОТПРАВЛЕНО</button>';
            html += '<button data-x="cancel" style="background:transparent;border:1px solid #ff3b3b;color:#ff3b3b;padding:6px 12px;font-size:0.75rem;font-weight:700;border-radius:6px;cursor:pointer">❌ ОТМЕНИТЬ</button>';
            html += '</div>';
            el.innerHTML = html;
            el.querySelector('[data-x="sent"]').addEventListener('click', function(){ _0xwt(t._id, 'sent'); });
            el.querySelector('[data-x="cancel"]').addEventListener('click', function(){ _0xwt(t._id, 'cancel'); });
            frag.appendChild(el);
        });
        wrap.replaceChildren(frag);
    }catch(e){
        console.error('Withdrawals error:', e);
        wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#ff3b3b">Ошибка: ' + e.message + '</div>';
    }
}

async function _0xwt(id, action){
    if(!confirm(action === 'sent'
        ? 'Подтвердить отправку? Скин будет удалён окончательно.'
        : 'Отменить? Скин вернётся игроку.')) return;
    try{
        var wRef = window.fbDoc(window.fbDb, 'withdrawals', id);
        var wSnap = await window.fbGetDoc(wRef);
        if(!wSnap.exists()){ alert('Заявка не найдена'); return; }
        var w = wSnap.data();

        if(action === 'sent'){
            await window.fbUpdateDoc(wRef, { status: 'sent', resolvedAt: Date.now() });
            alert('✅ Отправлено! Скин удалён.');
        }else{
            // Возвращаем скин игроку
            var userRef = window.fbDoc(window.fbDb, 'users', w.uid);
            var userSnap = await window.fbGetDoc(userRef);
            if(userSnap.exists()){
                var ud = userSnap.data();
                var inv = ud.inventory || [];
                inv.push({ id: w.skinId, rarity: 'common' });
                await window.fbUpdateDoc(userRef, { inventory: inv, updatedAt: Date.now() });
            }
            await window.fbUpdateDoc(wRef, { status: 'cancelled', resolvedAt: Date.now() });
            alert('❌ Отменено. Скин возвращён игроку.');
        }
        _0xw();
    }catch(e){
        console.error('Withdraw resolve error:', e);
        alert('Ошибка: ' + e.message);
    }
}

/* ---------- Експорт у window ---------- */
window._0xToggle = _0xToggle;
window._0xAdm = _0xAdm;
window._0xa1 = _0xa1;
window._0xt = _0xt;
window._0xs = _0xs;
window._0xw = _0xw;
window._0xwt = _0xwt;

})();
