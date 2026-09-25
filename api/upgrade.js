const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { getClientIp, checkRateLimit } = require('../lib/rate-limit');
const { randomUUID } = require('crypto');
const SKINS = require('../lib/skins');
const { getCatalogPrice, withTimeout } = require('../lib/prices');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const MAX_SOURCES = 2;

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

function calcChance(sourcePrice, targetPrice) {
    if (!targetPrice || targetPrice <= 0) return 0;
    if (!sourcePrice || sourcePrice <= 0) return 0.01;
    const raw = (sourcePrice / targetPrice) * 100 * 0.90;
    if (raw > 95) return 95;
    if (raw < 0.01) return 0.01;
    return raw;
}

function invalidateUserCache(uid) {
    try {
        const userMod = require('./user');
        if (userMod.invalidateUserCache) userMod.invalidateUserCache(uid);
    } catch (e) { /* ignore */ }
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const ip = getClientIp(req);
    if (!checkRateLimit(`upgrade:${ip}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: 'Too many requests' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let steamId;
    try {
        const decoded = await withTimeout(getAuth().verifyIdToken(token), 5000, 'verifyIdToken');
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

    // Підтримка обох форматів: sourceUid (старий) і sourceUids (новий)
    let sourceUids = body.sourceUids;
    if (!Array.isArray(sourceUids)) {
        if (body.sourceUid && typeof body.sourceUid === 'string') {
            sourceUids = [body.sourceUid];
        } else {
            return res.status(400).json({ error: 'Missing sourceUids' });
        }
    }
    sourceUids = sourceUids.filter(u => typeof u === 'string' && u.length > 0);
    if (sourceUids.length === 0) return res.status(400).json({ error: 'No valid sourceUids' });
    if (sourceUids.length > MAX_SOURCES) return res.status(400).json({ error: 'Too many source items (max 2)' });

    const { targetId } = body || {};
    if (!targetId || typeof targetId !== 'string') return res.status(400).json({ error: 'Missing targetId' });

    const targetSkin = SKINS.find(s => s.id === targetId);
    if (!targetSkin) return res.status(404).json({ error: 'Target skin not found' });

    try {
        const db = getFirestore();
        const targetPrice = getCatalogPrice(targetSkin);
        const userRef = db.collection('users').doc(steamId);

        const result = await withTimeout(db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            // Знаходимо і перевіряємо всі source предмети
            const sourceItems = [];
            const sourceIndices = [];
            let totalSourcePrice = 0;

            for (const uid of sourceUids) {
                const idx = inventory.findIndex(i => i.uid === uid);
                if (idx === -1) throw new Error('Source item not in inventory: ' + uid);
                if (sourceIndices.includes(idx)) throw new Error('Duplicate source item');

                const item = inventory[idx];
                const skinDef = SKINS.find(s => s.id === item.id);
                const price = skinDef ? getCatalogPrice(skinDef) : (Number(item.price) || 0);
                if (price <= 0) throw new Error('Source item has no price: ' + item.name);

                sourceItems.push(item);
                sourceIndices.push(idx);
                totalSourcePrice += price;
            }

            if (targetPrice <= 0) throw new Error('Target item has no price');

            const chance = calcChance(totalSourcePrice, targetPrice);
            const roll = Math.random() * 100;
            const success = roll <= chance;

            // Видаляємо source предмети (з кінця, щоб індекси не зсувались)
            const sortedIndices = [...sourceIndices].sort((a, b) => b - a);
            for (const idx of sortedIndices) {
                inventory.splice(idx, 1);
            }

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

            let newBestDrop = data.bestDrop || null;
            let newBestUpgrade = data.bestUpgrade || null;

            if (success) {
                const newBestItem = {
                    id: targetSkin.id,
                    name: targetSkin.name,
                    rarity: targetSkin.rarity,
                    price: targetPrice
                };
                const prevBestDropPrice = (data.bestDrop && Number(data.bestDrop.price)) || 0;
                const prevBestUpgPrice = (data.bestUpgrade && Number(data.bestUpgrade.price)) || 0;

                if (targetPrice > prevBestDropPrice) newBestDrop = newBestItem;
                if (targetPrice > prevBestUpgPrice) newBestUpgrade = newBestItem;
            }

            tx.update(userRef, {
                inventory,
                totalWon: success
                    ? Math.round(((data.totalWon || 0) + targetPrice) * 100) / 100
                    : (data.totalWon || 0),
                totalLost: !success
                    ? Math.round(((data.totalLost || 0) + totalSourcePrice) * 100) / 100
                    : (data.totalLost || 0),
                upgrades: (data.upgrades || 0) + 1,
                housePlayerLost: !success
                    ? Math.round(((data.housePlayerLost || 0) + totalSourcePrice) * 100) / 100
                    : (data.housePlayerLost || 0),
                houseCasinoWon: success
                    ? Math.round(((data.houseCasinoWon || 0) + targetPrice) * 100) / 100
                    : (data.houseCasinoWon || 0),
                bestDrop: newBestDrop,
                bestUpgrade: newBestUpgrade,
                updatedAt: Date.now()
            });

            return {
                success,
                chance: Number(chance.toFixed(2)),
                roll: Number(roll.toFixed(2)),
                item: newItem,
                inventory,
                sourcePrice: totalSourcePrice,
                targetPrice,
                bestDrop: newBestDrop,
                bestUpgrade: newBestUpgrade
            };
        }), 12000, 'transaction');

        invalidateUserCache(steamId);
        return res.status(200).json(result);
    } catch (e) {
        console.error('[upgrade] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
