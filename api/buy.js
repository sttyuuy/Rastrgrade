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
   СИНХРОНІЗАЦІЯ ЦІН З FIRESTORE (те саме джерело, що й клієнт)
   ============================================================ */
function norm(s) {
    return (s || '').toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
}

let _priceCache = null;      // { normName: price }
let _priceCacheAt = 0;
const PRICE_CACHE_TTL = 15000; // 15 секунд

async function getFirestorePrices(db) {
    const now = Date.now();
    if (_priceCache && (now - _priceCacheAt) < PRICE_CACHE_TTL) {
        return _priceCache;
    }
    const map = {};
    try {
        const snap = await db.collection('skins').get();
        snap.forEach(doc => {
            const d = doc.data();
            if (d.name && d.price) {
                map[norm(d.name)] = d.price;
            }
        });
    } catch (e) {
        console.error('[buy] Firestore prices error:', e.message);
    }
    _priceCache = map;
    _priceCacheAt = now;
    return map;
}

/**
 * Реальна ціна скіна: Firestore (якщо є) -> статичний каталог (фолбек).
 * Це ТОЧНО повторює логіку _a1() на клієнті.
 */
async function getEffectivePrice(db, skin) {
    const prices = await getFirestorePrices(db);
    const fsPrice = prices[norm(skin.name)];
    return (fsPrice && fsPrice > 0) ? fsPrice : (skin.price || 0);
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(`buy:${ip}`, 30, 60 * 1000)) {
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

    const { skinId } = body || {};
    if (!skinId || typeof skinId !== 'string') {
        return res.status(400).json({ error: 'Missing skinId' });
    }

    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) {
        return res.status(404).json({ error: 'Skin not found' });
    }

    try {
        const db = getFirestore();

        // ⚠️ Ключовий фікс: беремо ту саму ціну, яку бачив гравець на фронтенді
        const effectivePrice = await getEffectivePrice(db, skin);

        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const balance = Number(data.balance) || 0;
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            // Порівнюємо з невеликим допуском на похибку округлення float
            if (balance < effectivePrice - 0.001) {
                throw new Error('Недостатньо коштів');
            }

            const newItem = {
                uid: randomUUID(),
                id: skin.id,
                name: skin.name,
                shortname: skin.shortname || '',
                svg: skin.svg || '',
                rarity: skin.rarity,
                price: effectivePrice, // зберігаємо реальну ціну купівлі, а не статичну
                boughtAt: Date.now()
            };

            const newBalance = Math.round((balance - effectivePrice) * 100) / 100;
            inventory.push(newItem);

            tx.update(userRef, {
                balance: newBalance,
                inventory,
                purchases: (data.purchases || 0) + 1,
                totalLost: Math.round(((data.totalLost || 0) + effectivePrice) * 100) / 100,
                updatedAt: Date.now()
            });

            return {
                balance: newBalance,
                inventory,
                item: newItem
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        if (err.message === 'Недостатньо коштів') {
            return res.status(400).json({ error: 'Недостатньо коштів' });
        }
        if (err.message === 'User not found') {
            return res.status(404).json({ error: 'User not found' });
        }
        console.error('Buy error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
