/**
 * Perplexity Search Service
 * Uses Perplexity AI to search for home service information
 */

import { perplexityClient } from '../config/perplexity';
import { logger } from '../utils/logger';
import { PerplexitySearchResult } from '../models/types';

export class PerplexityService {
    /**
     * Search for home service information
     */
    async searchHomeServiceInfo(query: string, category: string = 'general'): Promise<PerplexitySearchResult> {
        try {
            const enrichedQuery = `
        Answer this question about home services (${category}): ${query}
        
        Provide a concise, professional answer that a home service receptionist would give to a customer.
        Focus on practical information like typical costs, timeframes, and what customers should expect.
      `.trim();

            const response = await perplexityClient.chat([
                {
                    role: 'system',
                    content: 'You are a knowledgeable home service receptionist helping customers with their questions about plumbing, HVAC, electrical, and other home services.',
                },
                {
                    role: 'user',
                    content: enrichedQuery,
                },
            ]);

            const answer = response.choices[0].message.content;
            const sources = response.citations || [];

            logger.info(`Perplexity search completed for: ${query.substring(0, 50)}...`);

            return {
                answer,
                sources,
                confidence: 0.85,
            };
        } catch (error: any) {
            logger.error('Perplexity search failed:', error.message);
            throw new Error('Failed to search information');
        }
    }

    /**
     * Generate example Q&A pairs for a specific category
     */
    async generateExamples(category: string, count: number = 5): Promise<Array<{ question: string; answer: string }>> {
        try {
            const prompt = `
        Generate ${count} common customer questions and professional answers for ${category} home services.
        
        Format as JSON array:
        [
          {"question": "...", "answer": "..."},
          ...
        ]
        
        Focus on:
        - Pricing questions
        - Timeline/urgency questions
        - Process/what-to-expect questions
        - Emergency situations
        
        Answers should be concise (2-3 sentences) and helpful.
      `.trim();

            const response = await perplexityClient.chat([
                {
                    role: 'system',
                    content: 'You are an expert in home services creating training data for a chatbot.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ]);

            const content = response.choices[0].message.content;

            // Parse JSON response
            const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
            if (!jsonMatch) {
                throw new Error('Failed to parse JSON response from Perplexity');
            }

            const examples = JSON.parse(jsonMatch[0]);

            logger.info(`Generated ${examples.length} examples for ${category}`);

            return examples;
        } catch (error: any) {
            logger.error('Failed to generate examples:', error.message);
            throw new Error('Failed to generate examples');
        }
    }
}

export const perplexityService = new PerplexityService();
export default perplexityService;
