export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    const { method, url } = req;
    const query = req.query;
    // Root route
    if (url === '/' || url === '/api' || url === '/api/') {
        return res.status(200).json({
            status: 'ok',
            message: 'Backend API Running',
            timestamp: new Date().toISOString()
        });
    }
    // Health route
    if (url.includes('/health')) {
        return res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    }
    // Webhook verification (GET)
    if (method === 'GET' && url.includes('/webhook')) {
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).json({ error: 'Forbidden' });
    }
    // Webhook POST
    if (method === 'POST' && url.includes('/webhook')) {
        console.log('Webhook received:', JSON.stringify(req.body, null, 2));
        return res.status(200).json({
            success: true,
            message: 'Webhook received',
            data: req.body
        });
    }
    // 404 for unknown routes
    return res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: url
    });
}
