/**
 * TypeScript Type Definitions
 * All interfaces and types for the chatbot system
 */

export interface ChatMessage {
    id: string;
    session_id: string;
    user_message: string;
    bot_response: string;
    language: string;
    confidence_score: number;
    examples_used: Example[];
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface Example {
    id: string;
    question: string;
    answer: string;
    category: string;
    language: string;
    embedding?: number[];
    similarity?: number;
    source: 'manual' | 'perplexity' | 'learning';
    usage_count: number;
    success_rate: number;
    created_at: Date;
    updated_at: Date;
}

export interface ChatRequest {
    message: string;
    session_id?: string;
    language?: string;
    context?: Record<string, any>;
}

export interface ChatResponse {
    response: string;
    confidence: number;
    examples_used: number;
    session_id: string;
    suggested_actions?: SuggestedAction[];
}

export interface SuggestedAction {
    type: 'book_appointment' | 'get_quote' | 'emergency_service';
    label: string;
    data: Record<string, any>;
}

export interface PerplexitySearchResult {
    answer: string;
    sources: string[];
    confidence: number;
}

export interface RAGContext {
    query: string;
    examples: Example[];
    language: string;
    threshold: number;
}

export type LanguageCode = 'en' | 'es' | 'zh' | 'vi' | 'ko' | 'tl';

export interface ServiceCategory {
    id: string;
    name: string;
    description: string;
    common_questions: string[];
}
