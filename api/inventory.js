module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', 'https://rastrgrade.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const { steamid, appid, contextid } = req.query;
    
    if (!steamid || !appid) {
        return res.status(400).json({ error: 'Missing steamid or appid' });
    }
    
    const ctx = contextid || '2';
    const url = `https://steamcommunity.com/inventory/${steamid}/${appid}/${ctx}?l=english&count=5000`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: 'Steam API error', 
                status: response.status,
                private: response.status === 403
            });
        }
        
        const data = await response.json();
        
        if (!data.assets || !data.descriptions) {
            return res.json({ 
                assets: [], 
                descriptions: [],
                empty: true 
            });
        }
        
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.json(data);
    } catch (e) {
        console.error('Inventory error:', e.message);
        res.status(500).json({ error: e.message });
    }
};
