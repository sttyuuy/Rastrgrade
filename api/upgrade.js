/**
 * Апгрейд предметів (серверний RNG).
 * sourceUid — uid предмета в інвентарі.
 * targetId  — id предмета з каталогу lib/skins.js.
 */
const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');
const SKINS = require('../lib/skins');

function calcChance(sourcePrice, targetPrice) {
    if (targetPrice <= 0) return 0;
    const raw = (sourcePrice / targetPrice) * 100;
    return Math.max(1, Math.min(95, raw));
}

module.exports = async (req, res) => {
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

    const { sourceUid, targetId } = req.body || {};
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
        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const srcIdx = inventory.findIndex(i => i.uid === sourceUid);
            if (srcIdx === -1) throw new Error('Source item not in inventory');

            const sourceItem = inventory[srcIdx];
            const sourcePrice = Number(sourceItem.price) || 0;
            const targetPrice = Number(targetSkin.price) || 0;

            const chance = calcChance(sourcePrice, targetPrice);
            const roll = Math.random() * 100;
            const success = roll <= chance;

            inventory.splice(srcIdx, 1);

            let newItem = null;
            if (success) {
                const { randomUUID } = require('crypto');
                newItem = {
                    uid: randomUUID(),
                    id: targetSkin.id,
                    name: targetSkin.name,
                    shortname: targetSkin.shortname || '',
                    rarity: targetSkin.rarity,
                    price: targetSkin.price,
                    wonAt: Date.now(),
                };
                inventory.push(newItem);
            }

            tx.update(userRef, {
                inventory,
                totalWon: success
                    ? Math.round(((data.totalWon || 0) + targetPrice) * 100) / 100
                    : (data.totalWon || 0),
                updatedAt: Date.now(),
            });

            return {
                success,
                chance: Number(chance.toFixed(2)),
                roll: Number(roll.toFixed(2)),
                item: newItem,
                inventory,
            };
        });

        return res.status(200).json(result);
    } catch (e) {
        console.error('[upgrade] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
