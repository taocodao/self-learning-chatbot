/**
 * Perplexity AI Configuration
 */

import axios, { AxiosInstance } from 'axios';
import { env } from './environment';
import { logger } from '../utils/logger';

export class PerplexityClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: 'https://api.perplexity.ai',
            headers: {
                'Authorization': `Bearer ${env.PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });

        logger.info('✓ Perplexity AI client initialized');
    }

    async chat(messages: Array<{ role: string; content: string }>, model: string = env.PERPLEXITY_MODEL): Promise<any> {
        try {
            const response = await this.client.post('/chat/completions', {
                model,
                messages,
                temperature: 0.2,
                max_tokens: 1000,
            });
            return response.data;
        } catch (error: any) {
            logger.error('Perplexity API error:', error.response?.data || error.message);
            throw error;
        }
    }
}

export const perplexityClient = new PerplexityClient();
export default perplexityClient;
