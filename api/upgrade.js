const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const { randomUUID } = require('crypto');
const SKINS = require('../lib/skins');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

/* ============================================================
   ЦІНИ З FIRESTORE — СИНХРОНІЗОВАНО З КЛІЄНТОМ
   ============================================================ */
function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

let _priceCache = null;
let _priceCacheAt = 0;
const PRICE_CACHE_TTL = 15000;

async function getFirestorePrices(db) {
    const now = Date.now();
    if (_priceCache && (now - _priceCacheAt) < PRICE_CACHE_TTL) return _priceCache;
    const map = {};
    try {
        const snap = await db.collection('skins').get();
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.price) map[norm(d.name)] = d.price;
        });
    } catch (e) {
        console.error('[upgrade] Firestore prices error:', e.message);
    }
    _priceCache = map;
    _priceCacheAt = now;
    return map;
}

/**
 * Реальна ціна скіна: Firestore (якщо є) -> статичний каталог.
 * ТОЧНО повторює логіку _a1() на клієнті.
 */
async function getEffectivePrice(db, skin) {
    if (!skin) return 0;
    const prices = await getFirestorePrices(db);
    const fsPrice = prices[norm(skin.name)];
    if (fsPrice && fsPrice > 0) return fsPrice;
    return Number(skin.price) || 0;
}

/**
 * ФОРМУЛА ШАНСУ — СИНХРОНІЗОВАНА З КЛІЄНТОМ (_ch).
 * Клієнт: (sourcePrice / targetPrice) * 100 * 0.90
 */
function calcChance(sourcePrice, targetPrice) {
    if (!targetPrice || targetPrice <= 0) return 0;
    if (!sourcePrice || sourcePrice <= 0) return 0.01;
    const raw = (sourcePrice / targetPrice) * 100 * 0.90;
    if (raw > 95) return 95;
    if (raw < 0.01) return 0.01;
    return raw;
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`upgrade:${ip}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let steamId;
    try {
        const decoded = await getAuth().verifyIdToken(token);
        steamId = decoded.uid;
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { sourceUid, targetId } = body || {};
    if (!sourceUid || typeof sourceUid !== 'string') {
        return res.status(400).json({ error: 'Missing sourceUid' });
    }
    if (!targetId || typeof targetId !== 'string') {
        return res.status(400).json({ error: 'Missing targetId' });
    }

    const targetSkin = SKINS.find(s => s.id === targetId);
    if (!targetSkin) {
        return res.status(404).json({ error: 'Target skin not found' });
    }

    try {
        const db = getFirestore();

        // Ціна цілі — та сама, що бачить гравець (Firestore -> fallback на SKINS)
        const targetPrice = await getEffectivePrice(db, targetSkin);

        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const srcIdx = inventory.findIndex(i => i.uid === sourceUid);
            if (srcIdx === -1) throw new Error('Source item not in inventory');

            const sourceItem = inventory[srcIdx];

            // ============================================================
            // ⚠️ КЛЮЧОВИЙ ФІКС:
            // Ціна джерела береться ТОЧНО як на клієнті (_a1):
            //   1. Firestore за name (жива ціна)
            //   2. fallback — РЕАЛЬНА ціна покупки (item.price), НЕ каталог
            //
            // Попередня версія використовувала SKINS.find(id).price як fallback —
            // це давало розбіжність з клієнтом, бо клієнт завжди падає на item.price.
            // ============================================================
            const sourceSkin = SKINS.find(s => s.id === sourceItem.id);
            let sourcePrice = 0;

            if (sourceSkin) {
                // Firestore за name -> fallback на РЕАЛЬНУ ціну покупки
                const prices = await getFirestorePrices(db);
                const fsPrice = prices[norm(sourceSkin.name)];
                sourcePrice = (fsPrice && fsPrice > 0)
                    ? fsPrice
                    : (Number(sourceItem.price) || 0);
            } else {
                // Немає в каталозі — тільки реальна ціна покупки
                sourcePrice = Number(sourceItem.price) || 0;
            }

            if (sourcePrice <= 0) {
                throw new Error('Source item has no price — cannot upgrade');
            }
            if (targetPrice <= 0) {
                throw new Error('Target item has no price');
            }

            const chance = calcChance(sourcePrice, targetPrice);
            const roll = Math.random() * 100;
            const success = roll <= chance;

            inventory.splice(srcIdx, 1);

            let newItem = null;
            if (success) {
                newItem = {
                    uid: randomUUID(),
                    id: targetSkin.id,
                    name: targetSkin.name,
                    shortname: targetSkin.shortname || '',
                    svg: targetSkin.svg || '',
                    rarity: targetSkin.rarity,
                    price: targetPrice,
                    wonAt: Date.now()
                };
                inventory.push(newItem);
            }

            tx.update(userRef, {
                inventory,
                totalWon: success
                    ? Math.round(((data.totalWon || 0) + targetPrice) * 100) / 100
                    : (data.totalWon || 0),
                totalLost: !success
                    ? Math.round(((data.totalLost || 0) + sourcePrice) * 100) / 100
                    : (data.totalLost || 0),
                upgrades: (data.upgrades || 0) + 1,
                housePlayerLost: !success
                    ? Math.round(((data.housePlayerLost || 0) + sourcePrice) * 100) / 100
                    : (data.housePlayerLost || 0),
                houseCasinoWon: success
                    ? Math.round(((data.houseCasinoWon || 0) + targetPrice) * 100) / 100
                    : (data.houseCasinoWon || 0),
                updatedAt: Date.now()
            });

            return {
                success,
                chance: Number(chance.toFixed(2)),
                roll: Number(roll.toFixed(2)),
                item: newItem,
                inventory,
                sourcePrice,
                targetPrice
            };
        });

        return res.status(200).json(result);
    } catch (e) {
        console.error('[upgrade] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
