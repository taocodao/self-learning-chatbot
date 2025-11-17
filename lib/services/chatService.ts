/**
 * Chat Service - Main conversation handling
 * Orchestrates RAG retrieval, Perplexity search, and response generation
 */

import { ragService } from './ragService';
import { perplexityService } from './perplexityService';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { ChatRequest, ChatResponse, ChatMessage, SuggestedAction } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

export class ChatService {
    /**
     * Process incoming chat message
     */
    async processMessage(request: ChatRequest): Promise<ChatResponse> {
        const sessionId = request.session_id || uuidv4();
        const language = request.language || this.detectLanguage(request.message) || 'en';
        const userMessage = request.message.trim();

        logger.info(`Processing message: session=${sessionId}, language=${language}`);

        try {
            // Step 1: Retrieve relevant examples using RAG
            const examples = await ragService.retrieveRelevantExamples(
                userMessage,
                language,
                5,
                0.75
            );

            logger.info(`Found ${examples.length} relevant examples`);

            // Step 2: Determine response strategy based on example quality
            let response: string;
            let confidence: number;
            let strategy: 'rag_high' | 'rag_medium' | 'perplexity_only';

            if (examples.length > 0 && examples[0].similarity! > 0.85) {
                // Strategy 1: High confidence RAG - use best example directly
                response = examples[0].answer;
                confidence = examples[0].similarity!;
                strategy = 'rag_high';

                await ragService.trackExampleUsage([examples[0].id]);

                logger.info(`Using RAG (high confidence): similarity=${confidence.toFixed(3)}`);
            } else if (examples.length > 0) {
                // Strategy 2: Medium confidence - use Perplexity with RAG context
                const context = examples
                    .map((ex, idx) => `Example ${idx + 1}:\nQ: ${ex.question}\nA: ${ex.answer}`)
                    .join('\n\n');

                const enrichedQuery = `
          You are a professional home service receptionist. Based on these similar past conversations:
          
          ${context}
          
          Now answer this customer question professionally and helpfully:
          "${userMessage}"
          
          Provide a concise answer (2-3 sentences) that a receptionist would give.
        `.trim();

                const perplexityResult = await perplexityService.searchHomeServiceInfo(
                    enrichedQuery,
                    this.detectCategory(userMessage)
                );

                response = perplexityResult.answer;
                confidence = 0.75;
                strategy = 'rag_medium';

                await ragService.trackExampleUsage(examples.slice(0, 3).map(ex => ex.id));

                logger.info('Using Perplexity with RAG context');
            } else {
                // Strategy 3: Low confidence - pure Perplexity search
                const perplexityResult = await perplexityService.searchHomeServiceInfo(
                    userMessage,
                    this.detectCategory(userMessage)
                );

                response = perplexityResult.answer;
                confidence = 0.6;
                strategy = 'perplexity_only';

                logger.info('Using pure Perplexity search (no relevant examples found)');
            }

            // Step 3: Log conversation for learning
            const chatId = uuidv4();
            await this.logConversation({
                id: chatId,
                session_id: sessionId,
                user_message: userMessage,
                bot_response: response,
                language,
                confidence_score: confidence,
                examples_used: examples,
                timestamp: new Date(),
                metadata: { strategy },
            });

            // Step 4: Get suggested actions
            const suggestedActions = this.getSuggestedActions(userMessage);

            // Step 5: Return response
            return {
                response,
                confidence,
                examples_used: examples.length,
                session_id: sessionId,
                suggested_actions: suggestedActions,
            };
        } catch (error: any) {
            logger.error('Chat processing error:', error.message);
            throw error;
        }
    }

    /**
     * Detect language from message
     */
    private detectLanguage(message: string): string {
        const lowerMessage = message.toLowerCase();

        if (
            lowerMessage.includes('hola') ||
            lowerMessage.includes('gracias') ||
            lowerMessage.includes('necesito') ||
            lowerMessage.includes('cuánto')
        ) {
            return 'es';
        }

        if (
            message.includes('你好') ||
            message.includes('谢谢') ||
            message.includes('需要')
        ) {
            return 'zh';
        }

        if (
            lowerMessage.includes('xin chào') ||
            lowerMessage.includes('cảm ơn')
        ) {
            return 'vi';
        }

        return 'en';
    }

    /**
     * Detect service category from message
     */
    private detectCategory(message: string): string {
        const lowerMessage = message.toLowerCase();

        const categoryKeywords: Record<string, string[]> = {
            plumbing: ['plumb', 'leak', 'pipe', 'drain', 'faucet', 'toilet', 'sink', 'water'],
            hvac: ['hvac', 'heat', 'ac', 'air', 'furnace', 'thermostat', 'duct', 'cool'],
            electrical: ['electric', 'wiring', 'outlet', 'breaker', 'light', 'switch', 'power'],
            roofing: ['roof', 'shingle', 'gutter', 'attic'],
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                return category;
            }
        }

        return 'general';
    }

    /**
     * Get suggested actions based on message content
     */
    private getSuggestedActions(message: string): SuggestedAction[] {
        const lowerMessage = message.toLowerCase();
        const actions: SuggestedAction[] = [];

        if (
            lowerMessage.includes('book') ||
            lowerMessage.includes('appointment') ||
            lowerMessage.includes('schedule')
        ) {
            actions.push({
                type: 'book_appointment',
                label: 'Book Appointment',
                data: { url: '/book', action: 'book_appointment' },
            });
        }

        if (
            lowerMessage.includes('quote') ||
            lowerMessage.includes('cost') ||
            lowerMessage.includes('price')
        ) {
            actions.push({
                type: 'get_quote',
                label: 'Get Free Quote',
                data: { url: '/quote', action: 'get_quote' },
            });
        }

        if (
            lowerMessage.includes('emergency') ||
            lowerMessage.includes('urgent') ||
            lowerMessage.includes('asap')
        ) {
            actions.push({
                type: 'emergency_service',
                label: 'Call Emergency Service',
                data: { phone: '1-800-EMERGENCY', urgent: true },
            });
        }

        return actions;
    }

    /**
     * Log conversation to database for learning
     */
    private async logConversation(chat: ChatMessage): Promise<void> {
        try {
            await supabase.from('chat_logs').insert({
                id: chat.id,
                session_id: chat.session_id,
                user_message: chat.user_message,
                bot_response: chat.bot_response,
                language: chat.language,
                confidence_score: chat.confidence_score,
                examples_used: chat.examples_used.map(ex => ex.id),
                timestamp: chat.timestamp.toISOString(),
                metadata: chat.metadata,
            });

            logger.debug(`Conversation logged: ${chat.id}`);
        } catch (error: any) {
            logger.error('Error logging conversation:', error.message);
        }
    }

    /**
     * Submit feedback for a chat response
     */
    async submitFeedback(
        chatId: string,
        rating: number,
        helpful: boolean,
        comment?: string
    ): Promise<void> {
        try {
            await supabase
                .from('chat_logs')
                .update({
                    feedback_rating: rating,
                    feedback_helpful: helpful,
                    feedback_comment: comment,
                })
                .eq('id', chatId);

            if (helpful && rating >= 4) {
                const { data: chat } = await supabase
                    .from('chat_logs')
                    .select('*')
                    .eq('id', chatId)
                    .single();

                if (chat) {
                    await ragService.addExample(
                        chat.user_message,
                        chat.bot_response,
                        'general',
                        chat.language,
                        'learning'
                    );

                    logger.info(`Learned from feedback: added new example from chat ${chatId}`);
                }
            }

            logger.info(`Feedback submitted for chat ${chatId}: rating=${rating}, helpful=${helpful}`);
        } catch (error: any) {
            logger.error('Error submitting feedback:', error.message);
            throw error;
        }
    }
}

export const chatService = new ChatService();
export default chatService;
