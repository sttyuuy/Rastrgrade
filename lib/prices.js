/**
 * Спільні ціни для sell / sell-all / buy / upgrade.
 * Джерело істини — статичний каталог lib/skins.js.
 * Firestore більше не використовується для цін (щоб не горіла квота).
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

/* ── Каталог цін (статичний) ── */
const catalog = {};
SKINS.forEach(s => { catalog[norm(s.name)] = Number(s.price) || 0; });

/* ── API ── */
function getCatalogPrice(skin) {
    if (!skin) return 0;
    const key = norm(skin.name);
    const price = catalog[key];
    return (price && price > 0) ? price : (Number(skin.price) || 0);
}

function priceForItem(item) {
    if (!item) return 0;
    const key = norm(item.name);
    const price = catalog[key];
    if (price > 0) return price;
    return Number(item.price) || 0;
}

module.exports = { norm, withTimeout, getCatalogPrice, priceForItem, catalog };
