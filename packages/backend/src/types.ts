export interface Message {
    id: string;
    sessionId: string;
    content: string;
    role: 'user' | 'assistant';
    sender: 'user' | 'bot';
    timestamp: Date;
    type: 'text' | 'image' | 'audio';
    metadata?: any;
}

export interface Conversation {
    id: string;
    messages: Message[];
    createdAt: Date;
    isActive: boolean;
    platform: string;
}

export interface LearningData {
    id: string;
    query: string;
    response: string;
    input: string;
    output: string;
    feedback?: string;
    context?: any;
    confidence?: number;
    createdAt: Date;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface WhatsAppMessage {
    from: string;
    to: string;
    text: string;
    type: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface Example {
    id: string;
    input: string;
    output: string;
    embedding?: number[];
}

export interface ExampleWithSimilarity extends Example {
    similarity: number;
}
