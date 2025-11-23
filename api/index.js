module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    try {
        const { method, url } = req;
        const query = req.query || {};
        const path = url ? url.split('?')[0] : '/';
        console.log(`[${method}] ${path}`);
        // Root and health endpoints
        if (path === '/' || path === '/api' || path === '/api/' || path.includes('/health')) {
            return res.status(200).json({
                status: 'ok',
                message: 'Backend API Running',
                timestamp: new Date().toISOString(),
                path: path
            });
        }
        // Webhook GET verification
        if (method === 'GET' && path.includes('/webhook')) {
            const mode = query['hub.mode'];
            const token = query['hub.verify_token'];
            const challenge = query['hub.challenge'];
            console.log('Webhook verification:', { mode, token: token ? 'present' : 'missing' });
            if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                console.log('✓ Webhook verified');
                return res.status(200).send(challenge);
            }
            console.log('✗ Webhook verification failed');
            return res.status(403).json({ error: 'Forbidden' });
        }
        // Webhook POST
        if (method === 'POST' && path.includes('/webhook')) {
            console.log('Webhook POST:', JSON.stringify(req.body, null, 2));
            return res.status(200).json({
                success: true,
                message: 'Webhook received',
                timestamp: new Date().toISOString()
            });
        }
        // 404 for unknown routes
        return res.status(404).json({
            success: false,
            error: 'Not Found',
            path: path
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
};
