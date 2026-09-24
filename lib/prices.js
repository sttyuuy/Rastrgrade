/**
 * Спільні ціни для sell / sell-all.
 * Логіка повторює клієнтську _a1(): Firestore за назвою -> каталог -> збережена ціна предмета.
 */
const SKINS = require('./skins');

function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

function withTimeout(p, ms, label) {
    return Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label)), ms))
    ]);
}

const catalog = {};
SKINS.forEach(s => { catalog[norm(s.name)] = Number(s.price) || 0; });

let _cache = null;
let _cacheAt = 0;
const TTL = 5 * 60 * 1000;

async function getFirestorePrices(db) {
    const now = Date.now();
    if (_cache && (now - _cacheAt) < TTL) return _cache;
    try {
        const snap = await withTimeout(db.collection('skins').get(), 8000, 'skins.get');
        const map = {};
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.price) map[norm(d.name)] = d.price;
        });
        _cache = map;
        _cacheAt = now;
        return map;
    } catch (e) {
        console.error('[prices] error:', e.message);
        return _cache || {};
    }
}

async function getPriceMaps(db) {
    return { fs: await getFirestorePrices(db), catalog };
}

function priceForItem(maps, item) {
    const key = norm(item && item.name);
    const fs = maps.fs[key];
    if (fs > 0) return fs;
    if (maps.catalog[key] > 0) return maps.catalog[key];
    return Number(item && item.price) || 0;
}

module.exports = { norm, withTimeout, getPriceMaps, priceForItem };
