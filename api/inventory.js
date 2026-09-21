module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://rastrgrade.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { steamid, appid, contextid } = req.query;
    
    if (!steamid || !appid) {
        return res.status(400).json({ error: 'Missing steamid or appid' });
    }
    
    // steamid должен быть числом (SteamID64)
    if (!/^[0-9]{17}$/.test(steamid)) {
        return res.status(400).json({ error: 'Invalid SteamID format' });
    }
    
    const ctx = contextid || '2';
    const url = `https://steamcommunity.com/inventory/${steamid}/${appid}/${ctx}?l=english&count=2500`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        // Приватный инвентарь или ограничение
        if (response.status === 403) {
            return res.status(403).json({ 
                error: 'Инвентарь приватный или Steam ограничил запрос',
                private: true 
            });
        }
        
        if (response.status === 429) {
            return res.status(429).json({ 
                error: 'Слишком много запросов. Подожди 1-2 минуты.',
                rateLimited: true 
            });
        }
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: 'Steam вернул статус ' + response.status 
            });
        }
        
        const data = await response.json();
        
        // Пустой инвентарь
        if (!data.assets || data.assets.length === 0) {
            return res.json({ 
                assets: [], 
                descriptions: [],
                empty: true 
            });
        }
        
        // Кеш на 5 минут (Steam не любит частые запросы)
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(data);
    } catch (e) {
        console.error('Inventory error:', e.message);
        res.status(500).json({ error: e.message });
    }
};
