import { WhatsAppConfig } from '../types';
import ApiService from './ApiService';

class WhatsAppService {
  private config: WhatsAppConfig | null = null;

  public async initializeSession(userId: string): Promise<WhatsAppConfig> {
    const response = await ApiService.post<WhatsAppConfig>('/api/whatsapp/init', { userId });

    if (response.success && response.data) {
      this.config = response.data;
      localStorage.setItem('whatsappConfig', JSON.stringify(this.config));
      return this.config;
    }

    throw new Error(response.error || 'Failed to initialize WhatsApp session');
  }

  public async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    const response = await ApiService.post('/api/whatsapp/send', {
      phoneNumber,
      message,
    });

    return response.success;
  }

  public getWhatsAppLink(phoneNumber: string, message: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  }

  public openWhatsAppChat(phoneNumber: string, initialMessage: string): void {
    const link = this.getWhatsAppLink(phoneNumber, initialMessage);
    window.open(link, '_blank');
  }

  public getConfig(): WhatsAppConfig | null {
    if (!this.config) {
      const stored = localStorage.getItem('whatsappConfig');
      if (stored) {
        this.config = JSON.parse(stored);
      }
    }
    return this.config;
  }
}

export default new WhatsAppService();
