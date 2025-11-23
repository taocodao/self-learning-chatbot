const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    count?: number;
}

export class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_URL;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ============================================
    // SESSION ENDPOINTS
    // ============================================

    async createSession(barcodeData: string, businessSlug?: string) {
        return this.request('/api/session/create', {
            method: 'POST',
            body: JSON.stringify({ barcodeData, businessSlug }),
        });
    }

    async getSession(sessionId: string) {
        return this.request(`/api/session/${sessionId}`);
    }

    async endSession(sessionId: string) {
        return this.request(`/api/session/${sessionId}/end`, {
            method: 'POST',
        });
    }

    // ============================================
    // CHAT ENDPOINTS
    // ============================================

    async getChatHistory(sessionId: string) {
        return this.request(`/api/chat/${sessionId}`);
    }

    async sendMessage(sessionId: string, message: string, language: string = 'es') {
        return this.request('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ sessionId, message, language }),
        });
    }

    async submitFeedback(
        chatId: string,
        rating?: number,
        helpful?: boolean,
        comment?: string
    ) {
        return this.request(`/api/chat/${chatId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ rating, helpful, comment }),
        });
    }

    async learnFromConversation(chatId: string, category: string) {
        return this.request(`/api/chat/${chatId}/learn`, {
            method: 'POST',
            body: JSON.stringify({ category }),
        });
    }

    // ============================================
    // EXAMPLES ENDPOINTS
    // ============================================

    async getExamples(params?: {
        language?: string;
        category?: string;
        source?: string;
        limit?: number;
    }) {
        const query = new URLSearchParams(params as any).toString();
        return this.request(`/api/examples?${query}`);
    }

    async getExample(id: string) {
        return this.request(`/api/examples/${id}`);
    }

    async createExample(data: {
        question: string;
        answer: string;
        category: string;
        language?: string;
        source?: string;
    }) {
        return this.request('/api/examples', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateExample(id: string, data: Partial<{
        question: string;
        answer: string;
        category: string;
        language: string;
    }>) {
        return this.request(`/api/examples/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteExample(id: string) {
        return this.request(`/api/examples/${id}`, {
            method: 'DELETE',
        });
    }

    async bulkCreateFromPerplexity(
        queries: string[],
        category: string,
        language: string = 'es'
    ) {
        return this.request('/api/examples/bulk/perplexity', {
            method: 'POST',
            body: JSON.stringify({ queries, category, language }),
        });
    }

    // ============================================
    // BOOKING ENDPOINTS
    // ============================================

    async getAvailableSlots(businessId: string, date: string) {
        return this.request(`/api/booking/slots?businessId=${businessId}&date=${date}`);
    }

    async createBooking(bookingData: {
        customerId: string;
        businessId: string;
        serviceType: string;
        scheduledDate: string;
        scheduledTime: string;
        numberOfPeople?: number;
        specialRequests?: string;
    }) {
        return this.request('/api/booking', {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    }

    async confirmBooking(bookingId: string) {
        return this.request(`/api/booking/${bookingId}/confirm`, {
            method: 'POST',
        });
    }

    // ============================================
    // VIDEO ENDPOINTS
    // ============================================

    async uploadVideo(file: File, customerId: string, caption?: string) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('customerId', customerId);
        if (caption) formData.append('caption', caption);

        const response = await fetch(`${this.baseUrl}/api/video/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to upload video');
        }

        return response.json();
    }

    async getVideoAnalysis(videoId: string) {
        return this.request(`/api/video/${videoId}`);
    }

    async getCustomerVideos(customerId: string, limit: number = 10, offset: number = 0) {
        return this.request(`/api/video/customer/${customerId}?limit=${limit}&offset=${offset}`);
    }

    async deleteVideo(videoId: string) {
        return this.request(`/api/video/${videoId}`, {
            method: 'DELETE',
        });
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
        return this.request('/health');
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    getApiUrl(): string {
        return this.baseUrl;
    }

    isConnected(): boolean {
        return !!this.baseUrl;
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export default ApiClient;
