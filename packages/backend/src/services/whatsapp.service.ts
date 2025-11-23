import axios from 'axios';
import { logger } from '@/lib/utils/logger';
import type { WhatsAppMessage } from '../types';

export class WhatsAppService {
    private accessToken: string;
    private phoneNumberId: string;
    private apiVersion: string;
    private baseUrl: string;

    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
        this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
    }

    /**
     * Send rich welcome message with interactive menu
     * This creates a visual "landing page" in WhatsApp
     */
    async sendWelcomeLanding(to: string, businessName: string = 'Nuestro Servicio'): Promise<void> {
        try {
            // First, send a welcome image (optional but recommended)
            await this.sendImageMessage(
                to,
                'https://your-domain.com/images/welcome-banner.jpg', // Upload to your CDN
                `¡Bienvenido a ${businessName}! 👋`
            );

            // Then send interactive menu as the "landing page"
            await this.sendInteractiveLandingMenu(to, businessName);

            logger.info('Welcome landing sent', { to });
        } catch (error) {
            logger.error('Error sending welcome landing:', error);
            throw error;
        }
    }

    /**
     * Send interactive landing menu - acts as visual homepage
     */
    async sendInteractiveLandingMenu(to: string, businessName: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'list',
                        header: {
                            type: 'text',
                            text: `${businessName} 🏠`,
                        },
                        body: {
                            text: '¡Hola! Soy tu asistente virtual.\n\n¿Qué necesitas hoy?',
                        },
                        footer: {
                            text: 'Disponible 24/7',
                        },
                        action: {
                            button: 'Ver Opciones',
                            sections: [
                                {
                                    title: '🔧 Servicios',
                                    rows: [
                                        {
                                            id: 'services_plumbing',
                                            title: '🚿 Plomería',
                                            description: 'Reparaciones, instalaciones, emergencias',
                                        },
                                        {
                                            id: 'services_electrical',
                                            title: '⚡ Electricidad',
                                            description: 'Instalaciones y reparaciones eléctricas',
                                        },
                                        {
                                            id: 'services_hvac',
                                            title: '❄️ Climatización',
                                            description: 'AC, calefacción, ventilación',
                                        },
                                    ],
                                },
                                {
                                    title: '📋 Acciones Rápidas',
                                    rows: [
                                        {
                                            id: 'action_quote',
                                            title: '💰 Solicitar Cotización',
                                            description: 'Obtén un presupuesto para tu proyecto',
                                        },
                                        {
                                            id: 'action_booking',
                                            title: '📅 Agendar Cita',
                                            description: 'Reserva una fecha para el servicio',
                                        },
                                        {
                                            id: 'action_emergency',
                                            title: '🚨 Servicio de Emergencia',
                                            description: 'Atención urgente 24/7',
                                        },
                                    ],
                                },
                                {
                                    title: 'ℹ️ Información',
                                    rows: [
                                        {
                                            id: 'info_prices',
                                            title: 'Ver Precios',
                                            description: 'Lista de precios de servicios',
                                        },
                                        {
                                            id: 'info_hours',
                                            title: 'Horarios',
                                            description: 'Horarios de atención',
                                        },
                                        {
                                            id: 'info_about',
                                            title: 'Sobre Nosotros',
                                            description: 'Conoce nuestro equipo',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Interactive landing menu sent', { to });
        } catch (error) {
            logger.error('Error sending landing menu:', error);
            throw error;
        }
    }

    /**
     * Send image message (for visual branding)
     */
    async sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'image',
                    image: {
                        link: imageUrl,
                        caption: caption || '',
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Image message sent', { to, imageUrl });
        } catch (error) {
            logger.error('Error sending image:', error);
            throw error;
        }
    }

    /**
     * Send service catalog (visual product showcase)
     */
    async sendServiceCatalog(to: string): Promise<void> {
        try {
            // Note: This requires WhatsApp Business Manager catalog setup
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'catalog_message',
                        body: {
                            text: 'Explora nuestros servicios:',
                        },
                        action: {
                            name: 'catalog_message',
                        },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Catalog sent', { to });
        } catch (error) {
            logger.error('Error sending catalog:', error);
            // Fallback to regular message
            await this.sendTextMessage(to, 'Ver servicios disponibles en nuestro sitio web');
        }
    }

    /**
     * Send quick action buttons (simplified landing)
     */
    async sendQuickActions(to: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'button',
                        body: {
                            text: '¿Qué te gustaría hacer?',
                        },
                        action: {
                            buttons: [
                                {
                                    type: 'reply',
                                    reply: {
                                        id: 'ask_question',
                                        title: '💬 Preguntar',
                                    },
                                },
                                {
                                    type: 'reply',
                                    reply: {
                                        id: 'book_service',
                                        title: '📅 Agendar',
                                    },
                                },
                                {
                                    type: 'reply',
                                    reply: {
                                        id: 'send_video',
                                        title: '📹 Enviar Video',
                                    },
                                },
                            ],
                        },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Quick actions sent', { to });
        } catch (error) {
            logger.error('Error sending quick actions:', error);
            throw error;
        }
    }

    /**
     * Send location message
     */
    async sendLocationMessage(to: string, latitude: number, longitude: number, name: string, address: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'location',
                    location: {
                        latitude,
                        longitude,
                        name,
                        address,
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Location sent', { to });
        } catch (error) {
            logger.error('Error sending location:', error);
            throw error;
        }
    }

    /**
     * Send video message (promotional content)
     */
    async sendVideoMessage(to: string, videoUrl: string, caption?: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'video',
                    video: {
                        link: videoUrl,
                        caption: caption || '',
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('Video sent', { to });
        } catch (error) {
            logger.error('Error sending video:', error);
            throw error;
        }
    }

    // ... existing methods (sendTextMessage, sendButtonMessage, etc.)

    async sendTextMessage(to: string, text: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'text',
                    text: { body: text },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('WhatsApp text message sent', { to, length: text.length });
        } catch (error) {
            logger.error('Error sending WhatsApp message:', error);
            throw error;
        }
    }

    async sendButtonMessage(
        to: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>
    ): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'button',
                        body: { text: bodyText },
                        action: {
                            buttons: buttons.map(b => ({
                                type: 'reply',
                                reply: {
                                    id: b.id,
                                    title: b.title.substring(0, 20),
                                },
                            })),
                        },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('WhatsApp button message sent', { to, buttonsCount: buttons.length });
        } catch (error) {
            logger.error('Error sending button message:', error);
            throw error;
        }
    }

    async sendListMessage(
        to: string,
        bodyText: string,
        buttonText: string,
        sections: Array<{
            title: string;
            rows: Array<{ id: string; title: string; description?: string }>;
        }>
    ): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to,
                    type: 'interactive',
                    interactive: {
                        type: 'list',
                        body: { text: bodyText },
                        action: {
                            button: buttonText,
                            sections,
                        },
                    },
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info('WhatsApp list message sent', { to });
        } catch (error) {
            logger.error('Error sending list message:', error);
            throw error;
        }
    }

    async downloadMedia(mediaId: string): Promise<Buffer> {
        try {
            const mediaResponse = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                    },
                }
            );

            const mediaUrl = mediaResponse.data.url;

            const downloadResponse = await axios.get(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                },
                responseType: 'arraybuffer',
            });

            logger.info('Media downloaded', { mediaId, size: downloadResponse.data.length });

            return Buffer.from(downloadResponse.data);
        } catch (error) {
            logger.error('Error downloading media:', error);
            throw error;
        }
    }

    async markAsRead(messageId: string): Promise<void> {
        try {
            await axios.post(
                `${this.baseUrl}/messages`,
                {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: messageId,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            logger.error('Error marking message as read:', error);
        }
    }
}
