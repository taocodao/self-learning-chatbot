import OpenAI from 'openai';
import config from '../config';
import { Message } from '../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

class AIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: config.ai.openaiApiKey,
        });
    }

    public async generateResponse(userMessage: string, conversationHistory: Message[]): Promise<string> {
        try {
            const messages = this.buildConversationContext(userMessage, conversationHistory);

            const completion = await this.openai.chat.completions.create({
                model: config.ai.model,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            });

            return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
        } catch (error) {
            console.error('Error generating AI response:', error);
            return 'I apologize, but I encountered an error. Please try again.';
        }
    }

    private buildConversationContext(userMessage: string, history: Message[]): ChatCompletionMessageParam[] {
        const systemPrompt: ChatCompletionMessageParam = {
            role: 'system',
            content: `You are a helpful, friendly AI assistant in a self-learning chatbot system. 
      Your responses should be informative, concise, and personalized based on the conversation context.
      You learn from each interaction to provide better assistance over time.`,
        };

        const contextMessages: ChatCompletionMessageParam[] = history.slice(-10).map((msg) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content,
        }));

        const userMessageParam: ChatCompletionMessageParam = {
            role: 'user',
            content: userMessage,
        };

        return [systemPrompt, ...contextMessages, userMessageParam];
    }

    public async analyzeIntent(message: string): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Analyze the user message and return a single-word intent category: greeting, question, complaint, feedback, or general.',
                    },
                    {
                        role: 'user',
                        content: message
                    },
                ],
                temperature: 0.3,
                max_tokens: 10,
            });

            return completion.choices[0]?.message?.content?.toLowerCase() || 'general';
        } catch (error) {
            console.error('Error analyzing intent:', error);
            return 'general';
        }
    }

    public calculateConfidence(response: string): number {
        // Simple confidence calculation based on response characteristics
        const hasSpecificInfo = response.length > 50;
        const hasUncertaintyWords = /maybe|perhaps|possibly|might|could be/i.test(response);

        let confidence = 0.7;
        if (hasSpecificInfo) confidence += 0.2;
        if (hasUncertaintyWords) confidence -= 0.3;

        return Math.max(0.1, Math.min(1.0, confidence));
    }
}

export default new AIService();
