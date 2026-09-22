/**
 * Апгрейд предметів (серверний RNG)
 */
const { getFirestore } = require('../lib/firebase-admin');
const { isValidSteamId, isValidMarketHashName } = require('../lib/validation');
const { checkRateLimit, getClientIp } = require('../lib/rate-limit');

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

    const { steamId, sourceName, targetName } = req.body || {};

    if (!isValidSteamId(steamId)) {
        return res.status(400).json({ error: 'Invalid SteamID' });
    }
    if (!isValidMarketHashName(sourceName) || !isValidMarketHashName(targetName)) {
        return res.status(400).json({ error: 'Invalid item names' });
    }

    try {
        const db = getFirestore();
        const userRef = db.collection('users').doc(steamId);

        const result = await db.runTransaction(async (tx) => {
            const doc = await tx.get(userRef);
            if (!doc.exists) throw new Error('User not found');

            const data = doc.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const srcIdx = inventory.findIndex(i => i.marketHashName === sourceName);
            if (srcIdx === -1) throw new Error('Source item not in inventory');

            const sourceItem = inventory[srcIdx];
            const sourcePrice = Number(sourceItem.price) || 0;

            // Цільову ціну беремо з каталогу (окрема колекція items)
            const targetDoc = await tx.get(db.collection('items').doc(targetName));
            if (!targetDoc.exists) throw new Error('Target item not found');

            const targetPrice = Number(targetDoc.data().price) || 0;
            const chance = calcChance(sourcePrice, targetPrice);

            const roll = Math.random() * 100;
            const success = roll <= chance;

            // Завжди видаляємо source
            inventory.splice(srcIdx, 1);

            if (success) {
                inventory.push({
                    marketHashName: targetName,
                    price: targetPrice,
                    acquiredAt: new Date().toISOString(),
                });
            }

            tx.update(userRef, {
                inventory,
                totalWon: success ? (data.totalWon || 0) + targetPrice : (data.totalWon || 0),
            });

            return { success, chance: Number(chance.toFixed(2)) };
        });

        return res.status(200).json(result);
    } catch (e) {
        console.error('[upgrade] error:', e.message);
        return res.status(400).json({ error: e.message });
    }
};
