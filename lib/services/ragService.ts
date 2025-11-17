/**
 * RAG Service - Retrieval-Augmented Generation
 * Core logic for retrieving relevant examples from vector database
 */

import { supabase } from '../config/database';
import { embeddingService } from './embeddingService';
import { logger } from '../utils/logger';
import { Example } from '../models/types';
import { env } from '../config/environment';

export class RAGService {
    /**
     * Retrieve most relevant examples using vector similarity
     */
    async retrieveRelevantExamples(
        query: string,
        language: string = 'en',
        maxExamples: number = env.MAX_EXAMPLES_TO_RETRIEVE,
        threshold: number = env.SIMILARITY_THRESHOLD
    ): Promise<Example[]> {
        try {
            logger.info(`RAG retrieval started for query: "${query.substring(0, 50)}..."`);

            const startTime = Date.now();
            const queryEmbedding = await embeddingService.generateEmbedding(query);
            const embeddingTime = Date.now() - startTime;

            logger.debug(`Embedding generated in ${embeddingTime}ms`);

            const { data, error } = await supabase.rpc('match_examples', {
                query_embedding: queryEmbedding,
                match_threshold: threshold,
                match_count: maxExamples,
                filter_language: language,
            });

            if (error) {
                logger.error('Supabase match_examples error:', error);
                return [];
            }

            const searchTime = Date.now() - startTime;
            logger.info(`Retrieved ${data?.length || 0} examples in ${searchTime}ms`);

            const examples: Example[] = (data || []).map((item: any) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                category: item.category,
                language: item.language,
                similarity: item.similarity,
                source: item.source,
                usage_count: item.usage_count || 0,
                success_rate: item.success_rate || 0,
                created_at: new Date(item.created_at),
                updated_at: new Date(item.updated_at),
            }));

            return examples;
        } catch (error: any) {
            logger.error('RAG retrieval failed:', error.message);
            return [];
        }
    }

    /**
     * Add new example to database (learning mechanism)
     */
    async addExample(
        question: string,
        answer: string,
        category: string,
        language: string,
        source: 'manual' | 'perplexity' | 'learning' = 'manual'
    ): Promise<string | null> {
        try {
            logger.info(`Adding new example: category=${category}, source=${source}`);

            const embedding = await embeddingService.generateEmbedding(question);

            const { data, error } = await supabase
                .from('examples')
                .insert({
                    question,
                    answer,
                    category,
                    language,
                    embedding,
                    source,
                    usage_count: 0,
                    success_rate: 0,
                })
                .select('id')
                .single();

            if (error) {
                logger.error('Error inserting example:', error);
                throw error;
            }

            logger.info(`✓ Example added successfully: ${data.id}`);
            return data.id;
        } catch (error: any) {
            logger.error('Failed to add example:', error.message);
            return null;
        }
    }

    /**
     * Batch add multiple examples
     */
    async addExamplesBatch(
        examples: Array<{
            question: string;
            answer: string;
            category: string;
            language: string;
            source?: 'manual' | 'perplexity' | 'learning';
        }>
    ): Promise<{ added: number; failed: number }> {
        let added = 0;
        let failed = 0;

        for (const example of examples) {
            const id = await this.addExample(
                example.question,
                example.answer,
                example.category,
                example.language,
                example.source || 'manual'
            );

            if (id) {
                added++;
            } else {
                failed++;
            }
        }

        logger.info(`Batch add completed: ${added} added, ${failed} failed`);
        return { added, failed };
    }

    /**
     * Increment usage count for examples
     */
    async trackExampleUsage(exampleIds: string[]): Promise<void> {
        if (exampleIds.length === 0) return;

        try {
            for (const id of exampleIds) {
                await supabase.rpc('increment_example_usage', { example_id: id });
            }

            logger.debug(`Tracked usage for ${exampleIds.length} examples`);
        } catch (error: any) {
            logger.error('Error tracking usage:', error.message);
        }
    }

    /**
     * Get statistics about examples
     */
    async getStatistics(): Promise<{
        total: number;
        by_language: Record<string, number>;
        by_category: Record<string, number>;
        by_source: Record<string, number>;
    }> {
        try {
            const { data, error } = await supabase
                .from('examples')
                .select('language, category, source');

            if (error) throw error;

            const stats = {
                total: data?.length || 0,
                by_language: {} as Record<string, number>,
                by_category: {} as Record<string, number>,
                by_source: {} as Record<string, number>,
            };

            data?.forEach((item: any) => {
                stats.by_language[item.language] = (stats.by_language[item.language] || 0) + 1;
                stats.by_category[item.category] = (stats.by_category[item.category] || 0) + 1;
                stats.by_source[item.source] = (stats.by_source[item.source] || 0) + 1;
            });

            return stats;
        } catch (error: any) {
            logger.error('Error fetching statistics:', error.message);
            return {
                total: 0,
                by_language: {},
                by_category: {},
                by_source: {},
            };
        }
    }
}

export const ragService = new RAGService();
export default ragService;
