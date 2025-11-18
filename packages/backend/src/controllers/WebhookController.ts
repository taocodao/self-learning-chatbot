import { Request, Response } from 'express';
import WhatsAppService from '../services/WhatsAppService';
import ConversationModel from '../models/Conversation';
import MessageModel from '../models/Message';
import LearningService from '../services/LearningService';

class WebhookController {
    public async verify(req: Request, res: Response): Promise<void> {
        const mode = req.query['hub.mode'] as string;
        const token = req.query['hub.verify_token'] as string;
        const challenge = req.query['hub.challenge'] as string;

        const verifiedChallenge = WhatsAppService.verifyWebhook(mode, token, challenge);

        if (verifiedChallenge) {
            res.status(200).send(verifiedChallenge);
        } else {
            res.status(403).send('Forbidden');
        }
    }

    public async handleIncoming(req: Request, res: Response): Promise<void> {
        try {
            const message = WhatsAppService.parseIncomingMessage(req.body);

            if (!message || !message.text) {
                res.sendStatus(200);
                return;
            }

            // Find or create conversation for this user
            let conversations = await ConversationModel.findByUserId(message.from);
            let conversation = conversations.find((c) => c.isActive && c.platform === 'whatsapp');

            if (!conversation) {
                conversation = await ConversationModel.create(message.from, 'whatsapp');
            }

            // Save user message
            await MessageModel.create({
                sessionId: conversation.id,
                content: message.text.body,
                sender: 'user',
                type: 'text',
            });

            // Get conversation history
            const history = await MessageModel.getRecentMessages(conversation.id, 10);

            // Generate AI response
            const aiResponse = await LearningService.getEnhancedResponse(message.text.body, history);

            // Save bot message
            await MessageModel.create({
                sessionId: conversation.id,
                content: aiResponse,
                sender: 'bot',
                type: 'text',
            });

            // Send WhatsApp response
            await WhatsAppService.sendTextMessage(message.from, aiResponse);

            // Learn from interaction
            await LearningService.learnFromInteraction(message.text.body, aiResponse, history);

            res.sendStatus(200);
        } catch (error) {
            console.error('Error handling WhatsApp webhook:', error);
            res.sendStatus(500);
        }
    }
}

export default new WebhookController();
