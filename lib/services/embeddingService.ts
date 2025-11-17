/**
 * OpenAI Embedding Service
 * Generates vector embeddings for text
 */

import OpenAI from 'openai';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class EmbeddingService {
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await openai.embeddings.create({
                model: env.OPENAI_EMBEDDING_MODEL,
                input: text,
                dimensions: env.OPENAI_EMBEDDING_DIMENSIONS,
            });

            return response.data[0].embedding;
        } catch (error: any) {
            logger.error('Error generating embedding:', error.message);
            throw new Error('Failed to generate embedding');
        }
    }

    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const batchSize = 100;
            const batches: string[][] = [];

            for (let i = 0; i < texts.length; i += batchSize) {
                batches.push(texts.slice(i, i + batchSize));
            }

            const allEmbeddings: number[][] = [];

            for (const batch of batches) {
                const response = await openai.embeddings.create({
                    model: env.OPENAI_EMBEDDING_MODEL,
                    input: batch,
                    dimensions: env.OPENAI_EMBEDDING_DIMENSIONS,
                });

                allEmbeddings.push(...response.data.map(item => item.embedding));
            }

            return allEmbeddings;
        } catch (error: any) {
            logger.error('Error generating batch embeddings:', error.message);
            throw new Error('Failed to generate batch embeddings');
        }
    }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;
