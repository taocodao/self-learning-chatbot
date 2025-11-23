/**
 * Environment Configuration & Validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),

    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    OPENAI_API_KEY: z.string().startsWith('sk-'),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    OPENAI_EMBEDDING_DIMENSIONS: z.string().transform(Number).default('1536'),

    PERPLEXITY_API_KEY: z.string().startsWith('pplx-'),
    PERPLEXITY_MODEL: z.string().default('sonar-pro'),

    MAX_EXAMPLES_TO_RETRIEVE: z.string().transform(Number).default('5'),
    SIMILARITY_THRESHOLD: z.string().transform(Number).default('0.75'),
    DEFAULT_LANGUAGE: z.string().default('en'),

    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export const env = envSchema.parse(process.env);
export type Environment = z.infer<typeof envSchema>;
