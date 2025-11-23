const express = require('express');
const cors = require('cors');
const app = express();
// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Health routes
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Backend API Running' });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Webhook routes
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
});
app.get('/api/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.status(403).json({ error: 'Forbidden' });
    }
});
app.post('/webhook', (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true, message: 'Webhook received' });
});
app.post('/api/webhook', (req, res) => {
    console.log('Webhook received:', JSON.stringify(req.body, null, 2));
    res.status(200).json({ success: true, message: 'Webhook received' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});
// Export for Vercel
module.exports = app;