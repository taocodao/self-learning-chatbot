export interface Message {
    id: string;
    content: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    type: 'text' | 'image' | 'document';
}

export interface ChatSession {
    id: string;
    userId: string;
    startTime: Date;
    messages: Message[];
    isActive: boolean;
}

export interface BarcodeData {
    code: string;
    format: string;
    timestamp: Date;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface WhatsAppConfig {
    phoneNumber: string;
    sessionId: string;
    apiEndpoint: string;
}
