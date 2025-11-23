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
    businessSlug?: string;
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
    metadata?: Record<string, any>;
}

export interface Example {
    id: string;
    question: string;
    answer: string;
    category: string;
    language: string;
    embedding?: number[];
    source: 'manual' | 'perplexity' | 'learning';
    usageCount: number;
    successRate: number;
    createdAt: string;
    updatedAt: string;
}

// Add this: Extended type for examples with similarity scores
export interface ExampleWithSimilarity extends Example {
    similarity: number;
}

export interface Booking {
    id: string;
    customerId: string;
    businessId: string;
    serviceType: string;
    scheduledDate: string;
    scheduledTime: string;
    numberOfPeople: number;
    confirmationCode: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    depositAmount?: number;
    depositPaid: boolean;
    createdAt: string;
}

export interface VideoUpload {
    id: string;
    customerId: string;
    businessId?: string;
    originalFilename: string;
    fileSize: number;
    storagePath: string;
    thumbnailPath?: string;
    status: 'uploading' | 'processing' | 'analyzed' | 'failed';
    analysisResult?: VideoAnalysisResult;
    uploadedAt: string;
    processedAt?: string;
}

export interface VideoAnalysisResult {
    problemType: string;
    severity: 'minor' | 'moderate' | 'major' | 'emergency';
    description: string;
    detectedObjects: string[];
    suggestedActions: string[];
    estimatedCost: {
        min: number;
        max: number;
        currency: string;
    };
    estimatedDuration: string;
    requiredExpertise: string[];
    urgency: 'low' | 'medium' | 'high';
}

export interface WhatsAppMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'button' | 'interactive';
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        caption?: string;
    };
    video?: {
        id: string;
        mime_type: string;
        caption?: string;
    };
    audio?: {
        id: string;
        mime_type: string;
    };
    button?: {
        text: string;
        payload: string;
    };
    interactive?: {
        type: string;
        button_reply?: {
            id: string;
            title: string;
        };
        list_reply?: {
            id: string;
            title: string;
        };
    };
}
