import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/config/database';
import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '../types';

export const sessionRouter = Router();

sessionRouter.post('/create', async (req: Request, res: Response) => {
    try {
        const { barcodeData, businessSlug, userId, platform = 'whatsapp' } = req.body;

        if (!barcodeData) {
            res.status(400).json({
                success: false,
                error: 'barcodeData is required',
            } as ApiResponse);
            return;
        }

        const sessionId = uuidv4();
        const finalUserId = userId || uuidv4();

        const { data: session, error } = await supabase.from('user_sessions').insert({
            id: sessionId,
            user_id: finalUserId,
            barcode_data: barcodeData,
            business_slug: businessSlug,
            platform,
            phone_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
            status: 'active',
            created_at: new Date().toISOString(),
        }).select().single();

        if (error) throw error;

        logger.info(`Session created: ${sessionId}`);

        res.json({
            success: true,
            data: {
                sessionId: session.id,
                userId: finalUserId,
                phoneNumber: process.env.WHATSAPP_PHONE_NUMBER_ID,
                whatsappLink: `https://wa.me/${process.env.WHATSAPP_PHONE_NUMBER_ID}?text=SESSION:${sessionId}`,
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

sessionRouter.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        const { data, error } = await supabase.from('user_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw error;

        res.json({ success: true, data } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch session',
        } as ApiResponse);
    }
});


