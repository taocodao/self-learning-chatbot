import OpenAI from 'openai';
import { logger } from '@/lib/utils/logger';
import type { Example, ExampleWithSimilarity } from '../types';

export class OpenAIService {
    private openai: OpenAI;
    private embeddingModel: string;
    private chatModel: string;
    private embeddingDimensions: number;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
        this.chatModel = process.env.OPENAI_MODEL || 'gpt-4o';
        this.embeddingDimensions = parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536');
    }

    /**
     * Generate embeddings for text (used in self-learning RAG)
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: text,
                dimensions: this.embeddingDimensions,
            });

            return response.data[0].embedding;
        } catch (error) {
            logger.error('Error generating embedding:', error);
            throw error;
        }
    }

    /**
     * Generate chat response using examples as context (self-learning)
     * Accepts both Example and ExampleWithSimilarity types
     */
    async generateResponse(
        userMessage: string,
        examples: (Example | ExampleWithSimilarity)[],
        language: string
    ): Promise<string> {
        try {
            const systemPrompt = this.buildSystemPrompt(language);
            const contextPrompt = this.buildContextPrompt(examples);

            const response = await this.openai.chat.completions.create({
                model: this.chatModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'system', content: contextPrompt },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.7,
                max_tokens: 500,
            });

            return response.choices[0].message.content || 'I apologize, but I cannot provide a response at this time.';
        } catch (error) {
            logger.error('Error generating response:', error);
            throw error;
        }
    }

    /**
     * Analyze video frame with GPT-4o Vision
     */
    async analyzeVideoFrame(base64Image: string, prompt: string): Promise<any> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert home service technician analyzing images to diagnose problems. Always respond with valid JSON.',
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `${prompt}\n\nRespond in JSON format with: problemType, severity, description, detectedObjects[], suggestedActions[], estimatedCost{min,max,currency}, estimatedDuration, requiredExpertise[], urgency`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`,
                                    detail: 'high',
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
                temperature: 0.3,
            });

            const content = response.choices[0].message.content || '{}';

            try {
                return JSON.parse(content);
            } catch (parseError) {
                logger.warn('Failed to parse GPT-4o Vision response as JSON', { content });
                return {
                    problemType: 'unknown',
                    severity: 'moderate',
                    description: content,
                    detectedObjects: [],
                    suggestedActions: ['Contact a professional for assessment'],
                    estimatedCost: { min: 100, max: 500, currency: 'USD' },
                    estimatedDuration: '1-2 hours',
                    requiredExpertise: ['General contractor'],
                    urgency: 'medium',
                };
            }
        } catch (error) {
            logger.error('Error analyzing video frame:', error);
            return {
                error: 'Analysis failed',
                problemType: 'analysis_error',
                severity: 'unknown',
                description: 'Unable to analyze the video at this time. Please try again or contact support.',
            };
        }
    }

    /**
     * Generate comprehensive answer from Perplexity for learning
     */
    async generateWithPerplexity(query: string, language: string): Promise<string> {
        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify({
                    model: process.env.PERPLEXITY_MODEL || 'sonar-pro',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful home services expert. Answer in ${language}. Provide accurate, detailed, and practical advice.`,
                        },
                        {
                            role: 'user',
                            content: query,
                        },
                    ],
                    temperature: 0.2,
                    max_tokens: 1000,
                }),
            });

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
            }

            const data: any = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response from Perplexity API');
            }

            return data.choices[0].message.content;
        } catch (error) {
            logger.error('Error with Perplexity:', error);
            throw error;
        }
    }

    /**
     * Generate batch embeddings (more efficient for multiple texts)
     */
    async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            const response = await this.openai.embeddings.create({
                model: this.embeddingModel,
                input: texts,
                dimensions: this.embeddingDimensions,
            });

            return response.data.map((item: any) => item.embedding);
        } catch (error) {
            logger.error('Error generating batch embeddings:', error);
            throw error;
        }
    }

    /**
     * Build system prompt based on language
     */
    private buildSystemPrompt(language: string): string {
        const prompts: Record<string, string> = {
            en: 'You are a helpful home services assistant. Provide accurate, friendly, and professional advice. Be concise but thorough.',
            es: 'Eres un asistente útil de servicios para el hogar. Proporciona consejos precisos, amigables y profesionales. Sé conciso pero completo.',
            zh: '你是一个有帮助的家庭服务助手。提供准确、友好和专业的建议。简洁但全面。',
            vi: 'Bạn là trợ lý dịch vụ gia đình hữu ích. Cung cấp lời khuyên chính xác, thân thiện và chuyên nghiệp. Ngắn gọn nhưng đầy đủ.',
            ko: '당신은 유용한 홈 서비스 도우미입니다. 정확하고 친절하며 전문적인 조언을 제공하세요. 간결하지만 철저하게.',
            fr: 'Vous êtes un assistant de services à domicile utile. Fournissez des conseils précis, conviviaux et professionnels. Soyez concis mais complet.',
            de: 'Sie sind ein hilfreicher Hausdienstassistent. Geben Sie genaue, freundliche und professionelle Ratschläge. Seien Sie prägnant, aber gründlich.',
            pt: 'Você é um assistente útil de serviços domésticos. Forneça conselhos precisos, amigáveis e profissionais. Seja conciso, mas completo.',
        };

        return prompts[language] || prompts['en'];
    }

    /**
     * Build context prompt from examples
     * Works with both Example and ExampleWithSimilarity types
     */
    private buildContextPrompt(examples: (Example | ExampleWithSimilarity)[]): string {
        if (examples.length === 0) {
            return 'No relevant examples found in the knowledge base. Answer based on your general knowledge, but be clear about the limitations.';
        }

        const examplesText = examples
            .map((ex: Example | ExampleWithSimilarity, i: number) => {
                const similarityInfo = 'similarity' in ex
                    ? ` (Relevance: ${(ex.similarity * 100).toFixed(0)}%)`
                    : '';

                return `Example ${i + 1}${similarityInfo}:\nQ: ${ex.question}\nA: ${ex.answer}`;
            })
            .join('\n\n');

        return `Here are similar questions from our knowledge base:\n\n${examplesText}\n\nUse these examples as context to provide a helpful answer. Adapt the information to the user's specific question while maintaining accuracy.`;
    }

    /**
     * Validate that the API key is configured
     */
    validateConfiguration(): boolean {
        if (!process.env.OPENAI_API_KEY) {
            logger.error('OpenAI API key is not configured');
            return false;
        }

        return true;
    }

    /**
     * Get model information
     */
    getModelInfo(): {
        embeddingModel: string;
        chatModel: string;
        embeddingDimensions: number;
    } {
        return {
            embeddingModel: this.embeddingModel,
            chatModel: this.chatModel,
            embeddingDimensions: this.embeddingDimensions,
        };
    }
}
