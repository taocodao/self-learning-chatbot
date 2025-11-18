import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { WhatsAppMessage } from '../types';

class WhatsAppService {
    private api: AxiosInstance;
    private readonly phoneId: string;

    constructor() {
        this.phoneId = config.whatsapp.phoneId;
        this.api = axios.create({
            baseURL: `https://graph.facebook.com/v18.0/${this.phoneId}`,
            headers: {
                'Authorization': `Bearer ${config.whatsapp.apiToken}`,
                'Content-Type': 'application/json',
            },
        });
    }

    public async sendTextMessage(to: string, message: string): Promise<boolean> {
        try {
            const response = await this.api.post('/messages', {
                messaging_product: 'whatsapp',
                to,
                type: 'text',
                text: { body: message },
            });

            console.log('WhatsApp message sent:', response.data);
            return true;
        } catch (error) {
            console.error('Error sending WhatsApp message:', error);
            return false;
        }
    }

    public async sendTemplateMessage(to: string, templateName: string, languageCode: string = 'en'): Promise<boolean> {
        try {
            const response = await this.api.post('/messages', {
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                },
            });

            console.log('WhatsApp template sent:', response.data);
            return true;
        } catch (error) {
            console.error('Error sending WhatsApp template:', error);
            return false;
        }
    }

    public async markMessageAsRead(messageId: string): Promise<void> {
        try {
            await this.api.post('/messages', {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    public parseIncomingMessage(webhookData: any): WhatsAppMessage | null {
        try {
            const entry = webhookData.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (!message) return null;

            return {
                from: message.from,
                to: value.metadata.display_phone_number,
                type: message.type,
                text: message.text,
                image: message.image,
            };
        } catch (error) {
            console.error('Error parsing WhatsApp message:', error);
            return null;
        }
    }

    public verifyWebhook(mode: string, token: string, challenge: string): string | null {
        if (mode === 'subscribe' && token === config.whatsapp.webhookVerifyToken) {
            return challenge;
        }
        return null;
    }
}

export default new WhatsAppService();
