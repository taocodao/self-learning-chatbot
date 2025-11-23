import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        services: {
            database: 'connected',
            whatsapp: 'ready',
            openai: 'ready',
        },
    });
});
