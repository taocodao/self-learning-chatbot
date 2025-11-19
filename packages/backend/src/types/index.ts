export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: {
        timestamp?: string;
        requestId?: string;
        [key: string]: any;
    };
}

export interface Session {
    id: string;
    userId: string;
    barcodeData: string;
    platform: 'web' | 'whatsapp' | 'mobile';
    phoneNumber?: string;
    status: 'active' | 'ended';
    createdAt: string;
    endedAt?: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    userMessage: string;
    botResponse: string;
    language: string;
    confidenceScore: number;
    examplesUsed: string[];
    timestamp: string;
    feedbackRating?: number;
    feedbackHelpful?: boolean;
    feedbackComment?: string;
}

export interface WebSocketEvents {
    typing: { sessionId: string };
    stop_typing: { sessionId: string };
    message_received: { messageId: string; sessionId: string };
    user_joined: { socketId: string; timestamp: string };
    user_left: { socketId: string; timestamp: string };
    user_typing: { socketId: string; timestamp: string };
    user_stop_typing: { socketId: string };
    message_ack: { messageId: string; timestamp: string };
}
