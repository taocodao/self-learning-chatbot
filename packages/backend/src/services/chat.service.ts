import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/config/database';
import logger from '../lib/utils/logger';
import { OpenAIService } from './openai.service';
import type { ChatMessage, Example, ExampleWithSimilarity } from '../types';

export class ChatService {
    private openaiService: OpenAIService;

    constructor() {
        this.openaiService = new OpenAIService();
    }

    /**
     * Get chat history for a session
     */
    async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            logger.error('Error fetching chat history:', error);
            throw error;
        }
    }

    /**
     * Find similar examples using vector similarity search
     */
    async findSimilarExamples(
        embedding: number[],
        threshold: number = 0.75,
        limit: number = 5,
        language: string = 'en'
    ): Promise<ExampleWithSimilarity[]> {
        try {
            // Call the match_examples RPC function in Supabase
            const { data, error } = await supabase.rpc('match_examples', {
                query_embedding: embedding,
                match_threshold: threshold,
                match_count: limit,
                filter_language: language,
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            logger.error('Error finding similar examples:', error);
            return [];
        }
    }

    /**
     * Process user message with self-learning (RAG)
     * This is the core self-learning functionality
     */
    async processMessage(
        sessionId: string,
        userMessage: string,
        language: string = 'en'
    ): Promise<{
        id: string;
        response: string;
        confidence: number;
        examplesUsed: number;
    }> {
        try {
            logger.info('Processing message with self-learning', { sessionId, language });

            // Step 1: Generate embedding for user message
            const embedding = await this.openaiService.generateEmbedding(userMessage);

            // Step 2: Find similar examples using vector search (RAG)
            const similarExamples: ExampleWithSimilarity[] = await this.findSimilarExamples(
                embedding,
                0.75, // threshold
                5,    // top 5 examples
                language
            );

            logger.info(`Found ${similarExamples.length} similar examples`, {
                similarities: similarExamples.map((e: ExampleWithSimilarity) => e.similarity),
            });

            // Step 3: Generate response using examples as context
            const botResponse = await this.openaiService.generateResponse(
                userMessage,
                similarExamples,
                language
            );

            // Step 4: Calculate confidence based on example similarity
            const confidenceScore = similarExamples.length > 0
                ? similarExamples[0].similarity
                : 0.5;

            // Step 5: Save conversation to chat_logs
            const chatLog = {
                id: uuidv4(),
                session_id: sessionId,
                user_message: userMessage,
                bot_response: botResponse,
                language,
                confidence_score: confidenceScore,
                examples_used: similarExamples.map((e: ExampleWithSimilarity) => e.id),
                timestamp: new Date().toISOString(),
                metadata: {
                    examples_count: similarExamples.length,
                    top_similarity: similarExamples[0]?.similarity || 0,
                },
            };

            const { error: insertError } = await supabase
                .from('chat_logs')
                .insert(chatLog);

            if (insertError) throw insertError;

            // Step 6: Increment usage count for examples (learning mechanism)
            for (const example of similarExamples) {
                await this.incrementExampleUsage(example.id);
                logger.debug('Incremented usage for example', { exampleId: example.id });
            }

            logger.info('Message processed successfully', {
                messageId: chatLog.id,
                confidence: confidenceScore,
            });

            return {
                id: chatLog.id,
                response: botResponse,
                confidence: confidenceScore,
                examplesUsed: similarExamples.length,
            };
        } catch (error) {
            logger.error('Error processing message:', error);
            throw error;
        }
    }

    /**
     * Increment usage count for an example
     */
    async incrementExampleUsage(exampleId: string): Promise<void> {
        try {
            const { error } = await supabase.rpc('increment_example_usage', {
                example_id: exampleId,
            });

            if (error) throw error;
        } catch (error) {
            logger.error('Error incrementing example usage:', error);
        }
    }

    /**
     * Update success rate for an example
     */
    async updateExampleSuccessRate(exampleId: string, wasSuccessful: boolean): Promise<void> {
        try {
            const { error } = await supabase.rpc('update_example_success_rate', {
                example_id: exampleId,
                was_successful: wasSuccessful,
            });

            if (error) throw error;
        } catch (error) {
            logger.error('Error updating example success rate:', error);
        }
    }

    /**
     * Submit user feedback (used to update success rates)
     */
    async submitFeedback(
        chatId: string,
        feedback: {
            rating?: number;
            helpful?: boolean;
            comment?: string;
        }
    ): Promise<void> {
        try {
            // Update chat log
            const { error: updateError } = await supabase
                .from('chat_logs')
                .update({
                    feedback_rating: feedback.rating,
                    feedback_helpful: feedback.helpful,
                    feedback_comment: feedback.comment,
                })
                .eq('id', chatId);

            if (updateError) throw updateError;

            // Get examples used in this conversation
            const { data: chatLog, error: fetchError } = await supabase
                .from('chat_logs')
                .select('examples_used')
                .eq('id', chatId)
                .single();

            if (fetchError) throw fetchError;

            // Update success rate for each example
            if (chatLog.examples_used && feedback.helpful !== undefined) {
                for (const exampleId of chatLog.examples_used) {
                    await this.updateExampleSuccessRate(exampleId, feedback.helpful);
                }
            }

            logger.info('Feedback submitted and examples updated', { chatId });
        } catch (error) {
            logger.error('Error submitting feedback:', error);
            throw error;
        }
    }

    /**
     * Learn from conversation - promote good conversations to examples
     */
    async learnFromConversation(chatId: string, category: string): Promise<void> {
        try {
            const { data: chatLog, error } = await supabase
                .from('chat_logs')
                .select('*')
                .eq('id', chatId)
                .single();

            if (error) throw error;

            // Generate embedding for the user message
            const embedding = await this.openaiService.generateEmbedding(chatLog.user_message);

            // Create new example
            const { error: insertError } = await supabase
                .from('examples')
                .insert({
                    question: chatLog.user_message,
                    answer: chatLog.bot_response,
                    category,
                    language: chatLog.language,
                    embedding,
                    source: 'learning',
                    usage_count: 0,
                    success_rate: 0.8, // Start with good success rate
                });

            if (insertError) throw insertError;

            logger.info('Learned new example from conversation', { chatId, category });
        } catch (error) {
            logger.error('Error learning from conversation:', error);
            throw error;
        }
    }
}
