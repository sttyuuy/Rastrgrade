const { getFirestore, getAuth } = require('../lib/firebase-admin');
const { randomUUID } = require('crypto');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const SKINS = require('../lib/skins'); // каталог скінів на сервері

function setHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
}

async function getUidFromRequest(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;

    try {
        const decoded = await getAuth().verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

function calculateChance(sourcePrice, targetPrice) {
    if (!sourcePrice || !targetPrice || targetPrice <= 0) return 0;
    const raw = (sourcePrice / targetPrice) * 100;
    // Обмежуємо шанс від 1% до 95%
    return Math.min(95, Math.max(1, raw));
}

module.exports = async (req, res) => {
    setHeaders(res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const uid = await getUidFromRequest(req);
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

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
        const userRef = db.collection('users').doc(uid);

        const result = await db.runTransaction(async (tx) => {
            const snap = await tx.get(userRef);
            if (!snap.exists) throw new Error('User not found');

            const data = snap.data();
            const inventory = Array.isArray(data.inventory) ? [...data.inventory] : [];

            const sourceIndex = inventory.findIndex(i => i.uid === sourceUid);
            if (sourceIndex === -1) throw new Error('Source item not found');

            const sourceItem = inventory[sourceIndex];

            // Не можна апгрейдити на дешевший або такий самий
            if (targetSkin.price <= sourceItem.price) {
                throw new Error('Target must be more expensive');
            }

            const chance = calculateChance(sourceItem.price, targetSkin.price);
            const roll = Math.random() * 100;
            const success = roll < chance;

            // Видаляємо source завжди
            inventory.splice(sourceIndex, 1);

            let wonItem = null;

            if (success) {
                wonItem = {
                    uid: randomUUID(),
                    id: targetSkin.id,
                    name: targetSkin.name,
                    shortname: targetSkin.shortname || '',
                    rarity: targetSkin.rarity,
                    price: targetSkin.price,
                    upgradedAt: Date.now()
                };
                inventory.push(wonItem);
            }

            const update = {
                inventory,
                upgrades: (data.upgrades || 0) + 1,
                updatedAt: Date.now()
            };

            if (success) {
                update.totalWon = (data.totalWon || 0) + targetSkin.price;
                update.bestUpgrade = targetSkin.name;
            } else {
                update.totalLost = (data.totalLost || 0) + sourceItem.price;
            }

            tx.update(userRef, update);

            return {
                success,
                chance: Math.round(chance * 10) / 10,
                balance: data.balance || 0,
                inventory,
                wonItem,
                sourcePrice: sourceItem.price,
                targetPrice: targetSkin.price
            };
        });

        return res.status(200).json(result);
    } catch (err) {
        const map = {
            'User not found': [404, 'User not found'],
            'Source item not found': [404, 'Предмет не знайдено в інвентарі'],
            'Target must be more expensive': [400, 'Ціль повинна бути дорожчою']
        };

        if (map[err.message]) {
            const [status, message] = map[err.message];
            return res.status(status).json({ error: message });
        }

        console.error('Upgrade error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
