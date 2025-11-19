import { Router, Request, Response } from 'express';
import { logger } from '../../../../lib/utils/logger';

export const webhookRouter = Router();

// WhatsApp webhook verification (GET)
webhookRouter.get('/', (req: Request, res: Response) => {
    try {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('Webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            logger.warn('Webhook verification failed');
            res.sendStatus(403);
        }
    } catch (error) {
        logger.error('Error in webhook verification', error);
        res.sendStatus(500);
    }
});

// WhatsApp webhook messages (POST)
webhookRouter.post('/', async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        // Always respond 200 immediately
        res.sendStatus(200);

        // Process webhook asynchronously
        processWebhook(payload, req.app.get('io'));
    } catch (error) {
        logger.error('Error handling webhook', error);
        res.sendStatus(500);
    }
});

async function processWebhook(payload: any, io: any): Promise<void> {
    try {
        logger.info('Processing webhook payload', payload);

        const entry = payload.entry?.[0];
        if (!entry) return;

        const changes = entry.changes?.[0];
        if (!changes) return;

        const value = changes.value;

        // Handle incoming messages
        if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
                logger.info('Received WhatsApp message', {
                    from: message.from,
                    type: message.type,
                    id: message.id,
                });

                // TODO: Process message and send response
                // Emit to Socket.IO clients
                if (io) {
                    io.emit('whatsapp_message', {
                        from: message.from,
                        message: message.text?.body || '',
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        }

        // Handle status updates
        if (value.statuses && value.statuses.length > 0) {
            logger.debug('Message status update', value.statuses);
        }
    } catch (error) {
        logger.error('Error processing webhook payload', error);
    }
}
