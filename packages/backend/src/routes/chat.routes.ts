import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '../types';

export const chatRouter = Router();
const chatService = new ChatService();

// Get chat history for a session
chatRouter.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const history = await chatService.getChatHistory(sessionId);

        res.json({
            success: true,
            data: history,
            count: history.length,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching chat history:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch chat history',
        } as ApiResponse);
    }
});

// Process new message (self-learning core)
chatRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { sessionId, message, language = 'en' } = req.body;

        if (!sessionId || !message) {
            res.status(400).json({
                success: false,
                error: 'sessionId and message are required',
            } as ApiResponse);
            return;
        }

        // Process with self-learning
        const result = await chatService.processMessage(sessionId, message, language);

        // Emit to WebSocket clients
        const io = req.app.get('io');
        if (io) {
            io.to(sessionId).emit('new_message', {
                id: result.id,
                message: result.response,
                confidence: result.confidence,
                timestamp: new Date().toISOString(),
            });
        }

        res.json({
            success: true,
            data: result,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error processing message:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process message',
        } as ApiResponse);
    }
});

// Submit feedback
chatRouter.post('/:chatId/feedback', async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { rating, helpful, comment } = req.body;

        await chatService.submitFeedback(chatId, { rating, helpful, comment });

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to submit feedback',
        } as ApiResponse);
    }
});

// Learn from conversation (admin endpoint)
chatRouter.post('/:chatId/learn', async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { category } = req.body;

        if (!category) {
            res.status(400).json({
                success: false,
                error: 'category is required',
            } as ApiResponse);
            return;
        }

        await chatService.learnFromConversation(chatId, category);

        res.json({
            success: true,
            message: 'Example learned successfully',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error learning from conversation:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to learn',
        } as ApiResponse);
    }
});
