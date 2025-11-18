import LearningDataModel from '../models/LearningData';
import AIService from './AIService';
import { LearningData, Message } from '../types';

class LearningService {
    public async learnFromInteraction(
        query: string,
        response: string,
        context: Message[]
    ): Promise<LearningData> {
        const confidence = AIService.calculateConfidence(response);
        const contextStrings = context.map((msg) => msg.content);

        return await LearningDataModel.create({
            query,
            response,
            context: contextStrings,
            confidence,
        });
    }

    public async findSimilarInteractions(query: string): Promise<LearningData[]> {
        return await LearningDataModel.findSimilar(query, 5);
    }

    public async getEnhancedResponse(query: string, conversationHistory: Message[]): Promise<string> {
        // First, check if we have similar learned interactions
        const similarInteractions = await this.findSimilarInteractions(query);

        // If we have high-confidence learned responses, use them to enhance the context
        const highConfidenceResponses = similarInteractions.filter((data) => data.confidence >= 0.8);

        if (highConfidenceResponses.length > 0) {
            console.log(`Found ${highConfidenceResponses.length} high-confidence learned responses`);
            // Use learned responses to inform the AI response
            const learnedContext = highConfidenceResponses
                .map((data) => `Previous similar query: "${data.query}" → Response: "${data.response}"`)
                .join('\n');

            // Add learned context to conversation history
            const enhancedHistory = [
                ...conversationHistory,
                {
                    id: 'learned-context',
                    sessionId: '',
                    content: `Context from previous interactions:\n${learnedContext}`,
                    sender: 'bot' as const,
                    timestamp: new Date(),
                    type: 'text' as const,
                },
            ];

            return await AIService.generateResponse(query, enhancedHistory);
        }

        // Otherwise, generate a fresh response
        return await AIService.generateResponse(query, conversationHistory);
    }

    public async provideFeedback(learningId: string, feedback: 'positive' | 'negative'): Promise<void> {
        await LearningDataModel.updateFeedback(learningId, feedback);
    }
}

export default new LearningService();
