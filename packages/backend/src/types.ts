export interface Message {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
}

export interface Conversation {
    id: string;
    messages: Message[];
    createdAt: Date;
}

export interface LearningData {
    id: string;
    input: string;
    output: string;
    feedback?: string;
    createdAt: Date;
}
