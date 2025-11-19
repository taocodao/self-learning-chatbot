import { Router, Request, Response } from 'express';
import { supabase } from '../../../../lib/config/database';
import { logger } from '../../../../lib/utils/logger';
import type { ApiResponse } from '../types';

export const chatRouter = Router();

// Get chat history by session
chatRouter.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const { data, error } = await supabase
            .from('chat_logs')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching chat history', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Send message
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

        // TODO: Process message with AI
        const botResponse = `Echo: ${message}`;

        // Save to chat_logs
        const { data, error } = await supabase
            .from('chat_logs')
            .insert({
                session_id: sessionId,
                user_message: message,
                bot_response: botResponse,
                language,
                confidence_score: 0.8,
                timestamp: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // Emit via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(sessionId).emit('new_message', {
                id: data.id,
                message: botResponse,
                timestamp: data.timestamp,
            });
        }

        res.json({
            success: true,
            data: {
                id: data.id,
                response: botResponse,
                timestamp: data.timestamp,
            },
        } as ApiResponse);
    } catch (error) {
        logger.error('Error sending message', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Submit feedback
chatRouter.post('/:chatId/feedback', async (req: Request, res: Response) => {
    try {
        const { chatId } = req.params;
        const { rating, helpful, comment } = req.body;

        const { error } = await supabase
            .from('chat_logs')
            .update({
                feedback_rating: rating,
                feedback_helpful: helpful,
                feedback_comment: comment,
            })
            .eq('id', chatId);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Feedback submitted successfully',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error submitting feedback', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});
