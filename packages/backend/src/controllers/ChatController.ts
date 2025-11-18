import { Request, Response } from 'express';
import ConversationModel from '../models/Conversation';
import MessageModel from '../models/Message';
import AIService from '../services/AIService';
import LearningService from '../services/LearningService';
import { ApiResponse } from '../types';

class ChatController {
    public async getChatHistory(req: Request, res: Response): Promise<void> {
        try {
            const { sessionId } = req.params;

            const conversation = await ConversationModel.findById(sessionId);
            if (!conversation) {
                res.status(404).json({
                    success: false,
                    error: 'Session not found',
                } as ApiResponse);
                return;
            }

            const messages = await MessageModel.findBySessionId(sessionId);

            res.json({
                success: true,
                data: {
                    ...conversation,
                    messages,
                },
            } as ApiResponse);
        } catch (error) {
            console.error('Error getting chat history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve chat history',
            } as ApiResponse);
        }
    }

    public async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { sessionId, message } = req.body;

            if (!sessionId || !message) {
                res.status(400).json({
                    success: false,
                    error: 'Session ID and message are required',
                } as ApiResponse);
                return;
            }

            // Save user message
            const userMessage = await MessageModel.create({
                sessionId,
                content: message,
                sender: 'user',
                type: 'text',
            });

            // Get conversation history
            const history = await MessageModel.getRecentMessages(sessionId, 10);

            // Generate AI response with learning enhancement
            const aiResponse = await LearningService.getEnhancedResponse(message, history);

            // Save bot message
            const botMessage = await MessageModel.create({
                sessionId,
                content: aiResponse,
                sender: 'bot',
                type: 'text',
            });

            // Learn from this interaction
            await LearningService.learnFromInteraction(message, aiResponse, history);

            // Emit via WebSocket (handled by socket.io in server.ts)
            const io = req.app.get('io');
            io.to(sessionId).emit('message', botMessage);

            res.json({
                success: true,
                data: botMessage,
            } as ApiResponse);
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process message',
            } as ApiResponse);
        }
    }
}

export default new ChatController();
