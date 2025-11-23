import { Router, Request, Response } from 'express';
import { supabase } from '@/lib/config/database';
import { OpenAIService } from '../services/openai.service';
import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '../types';

export const examplesRouter = Router();
const openaiService = new OpenAIService();

// Get all examples
examplesRouter.get('/', async (req: Request, res: Response) => {
    try {
        const { language, category, source, limit = 50 } = req.query;

        let query = supabase.from('examples').select('*');

        if (language) query = query.eq('language', language);
        if (category) query = query.eq('category', category);
        if (source) query = query.eq('source', source);

        query = query.order('usage_count', { ascending: false }).limit(parseInt(limit as string));

        const { data, error } = await query;
        if (error) throw error;

        res.json({
            success: true,
            data: data || [],
            count: data?.length || 0,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching examples:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch examples',
        } as ApiResponse);
    }
});

// Get example by ID
examplesRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase.from('examples')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({ success: true, data } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching example:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch example',
        } as ApiResponse);
    }
});

// Create new example
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

        // Generate embedding
        const embedding = await openaiService.generateEmbedding(question);

        const { data, error } = await supabase.from('examples').insert({
            question,
            answer,
            category,
            language,
            source,
            embedding,
            usage_count: 0,
            success_rate: 0.5,
        }).select().single();

        if (error) throw error;

        logger.info('Example created', { id: data.id, category });

        res.json({ success: true, data } as ApiResponse);
    } catch (error) {
        logger.error('Error creating example:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create example',
        } as ApiResponse);
    }
});

// Update example
examplesRouter.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // If question changed, regenerate embedding
        if (updates.question) {
            updates.embedding = await openaiService.generateEmbedding(updates.question);
        }

        const { data, error } = await supabase.from('examples')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, data } as ApiResponse);
    } catch (error) {
        logger.error('Error updating example:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update example',
        } as ApiResponse);
    }
});

// Delete example
examplesRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase.from('examples').delete().eq('id', id);
        if (error) throw error;

        res.json({
            success: true,
            message: 'Example deleted',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error deleting example:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete example',
        } as ApiResponse);
    }
});

// Bulk create from Perplexity
examplesRouter.post('/bulk/perplexity', async (req: Request, res: Response) => {
    try {
        const { queries, category, language = 'en' } = req.body;

        if (!queries || !Array.isArray(queries) || queries.length === 0) {
            res.status(400).json({
                success: false,
                error: 'queries array is required',
            } as ApiResponse);
            return;
        }

        const results = [];

        for (const query of queries) {
            const answer = await openaiService.generateWithPerplexity(query, language);
            const embedding = await openaiService.generateEmbedding(query);

            const { data, error } = await supabase.from('examples').insert({
                question: query,
                answer,
                category,
                language,
                source: 'perplexity',
                embedding,
                usage_count: 0,
                success_rate: 0.5,
            }).select().single();

            if (!error) {
                results.push(data);
            }
        }

        logger.info(`Bulk created ${results.length} examples from Perplexity`);

        res.json({
            success: true,
            data: results,
            count: results.length,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error bulk creating examples:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create examples',
        } as ApiResponse);
    }
});


