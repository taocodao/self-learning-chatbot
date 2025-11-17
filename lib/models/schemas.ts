/**
 * Zod Validation Schemas
 * Runtime validation for API requests
 */

import { z } from 'zod';

export const ChatRequestSchema = z.object({
    message: z.string().min(1).max(2000),
    session_id: z.string().uuid().optional(),
    language: z.enum(['en', 'es', 'zh', 'vi', 'ko', 'tl']).optional(),
    context: z.record(z.any()).optional(),
});

export const ExampleCreateSchema = z.object({
    question: z.string().min(1).max(1000),
    answer: z.string().min(1).max(5000),
    category: z.string().min(1).max(100),
    language: z.enum(['en', 'es', 'zh', 'vi', 'ko', 'tl']),
    source: z.enum(['manual', 'perplexity', 'learning']).default('manual'),
});

export const FeedbackSchema = z.object({
    chat_id: z.string().uuid(),
    rating: z.number().min(1).max(5),
    helpful: z.boolean(),
    comment: z.string().optional(),
});
