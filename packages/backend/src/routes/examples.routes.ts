import { Router, Request, Response } from 'express';
import { supabase } from '../../../../lib/config/database';
import { logger } from '../../../../lib/utils/logger';
import type { ApiResponse } from '../types';

export const examplesRouter = Router();

// Get all examples
examplesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { language, category, limit = 50 } = req.query;

        let query = supabase
            .from('examples')
            .select('*');

        if (language) {
            query = query.eq('language', language);
        }

        if (category) {
            query = query.eq('category', category);
        }

        query = query
            .order('usage_count', { ascending: false })
            .limit(parseInt(limit as string));

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching examples', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Add new example
examplesRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { question, answer, category, language = 'en', source = 'manual' } = req.body;

        if (!question || !answer || !category) {
            res.status(400).json({
                success: false,
                error: 'question, answer, and category are required',
            } as ApiResponse);
            return;
        }

        const { data, error } = await supabase
            .from('examples')
            .insert({
                question,
                answer,
                category,
                language,
                source,
            })
            .select()
            .single();

        if (error) throw error;

        logger.info('Example created', { id: data.id, category });

        res.json({
            success: true,
            data,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error creating example', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Get example by ID
examplesRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('examples')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            res.status(404).json({
                success: false,
                error: 'Example not found',
            } as ApiResponse);
            return;
        }

        res.json({
            success: true,
            data,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching example', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Update example
examplesRouter.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('examples')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error updating example', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});

// Delete example
examplesRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('examples')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: 'Example deleted successfully',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error deleting example', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse);
    }
});
