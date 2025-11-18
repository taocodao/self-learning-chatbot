export interface Message {
    id: string;
    sessionId: string;
    content: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type: 'text' | 'image' | 'document';
    metadata?: Record<string, unknown>;
}

export interface Conversation {
    id: string;
    userId: string;
    startTime: Date;
    endTime?: Date;
    messages: Message[];
    isActive: boolean;
    platform: 'web' | 'whatsapp';
}

export interface LearningData {
    id: string;
    query: string;
    response: string;
    feedback?: 'positive' | 'negative';
    context: string[];
    timestamp: Date;
    confidence: number;
}

export interface WhatsAppMessage {
    from: string;
    to: string;
    type: 'text' | 'image' | 'document' | 'audio';
    text?: {
        body: string;
    };
    image?: {
        id: string;
        caption?: string;
    };
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
