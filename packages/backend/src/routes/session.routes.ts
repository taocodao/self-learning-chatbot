import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../../lib/config/database';
import { logger } from '../../../../lib/utils/logger';
import type { ApiResponse } from '../types';

export const sessionRouter = Router();

// Create session from barcode scan
sessionRouter.post('/create', async (req: Request, res: Response) => {
    try {
        const { barcodeData, userId, platform = 'web' } = req.body;

        if (!barcodeData) {
            res.status(400).json({
                success: false,
                error: 'Barcode data is required',
            } as ApiResponse);
            return;
        }

        const sessionId = uuidv4();
        const finalUserId = userId || uuidv4();

        // Create session in Supabase
        const { data: session, error: sessionError } = await supabase
            .from('user_sessions')
            .insert({
                id: sessionId,
                user_id: finalUserId,
                barcode_data: barcodeData,
                platform,
                phone_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (sessionError) throw sessionError;

        // Create initial conversation record
        const { error: conversationError } = await supabase
            .from('conversations')
            .insert({
                id: uuidv4(),
                session_id: sessionId,
                user_id: finalUserId,
                status: 'active',
                started_at: new Date().toISOString(),
            });

        if (conversationError) throw conversationError;

        logger.info(`Session created: ${sessionId} for user: ${finalUserId}`);

        res.json({
            success: true,
            data: {
                sessionId,
                userId: finalUserId,
                phoneNumber: process.env.WHATSAPP_PHONE_NUMBER_ID,
            },
        } as ApiResponse);
    } catch (error) {
        logger.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session',
        } as ApiResponse);
    }
});

// Get session by ID
sessionRouter.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const { data: session, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;

        if (!session) {
            res.status(404).json({
                success: false,
                error: 'Session not found',
            } as ApiResponse);
            return;
        }

        res.json({
            success: true,
            data: session,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session',
        } as ApiResponse);
    }
});

// End session
sessionRouter.post('/:sessionId/end', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const { error } = await supabase
            .from('user_sessions')
            .update({
                ended_at: new Date().toISOString(),
                status: 'ended',
            })
            .eq('id', sessionId);

        if (error) throw error;

        // Also end associated conversations
        await supabase
            .from('conversations')
            .update({
                status: 'ended',
                ended_at: new Date().toISOString(),
            })
            .eq('session_id', sessionId);

        logger.info(`Session ended: ${sessionId}`);

        res.json({
            success: true,
            message: 'Session ended successfully',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error ending session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to end session',
        } as ApiResponse);
    }
});
