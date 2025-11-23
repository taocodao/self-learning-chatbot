import { Router, Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { ChatService } from '../services/chat.service';
import { VideoService } from '../services/video.service';
import { BookingService } from '../services/booking.service';
import { supabase } from '@/lib/config/database';
import { logger } from '@/lib/utils/logger';
import type { WhatsAppMessage } from '../types';

export const webhookRouter = Router();

const whatsappService = new WhatsAppService();
const chatService = new ChatService();
const videoService = new VideoService();
const bookingService = new BookingService();

// ============================================
// WEBHOOK VERIFICATION (GET)
// ============================================
webhookRouter.get('/', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        logger.info('✓ WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
    } else {
        logger.warn('✗ WhatsApp webhook verification failed', { mode, token });
        res.sendStatus(403);
    }
});

// ============================================
// WEBHOOK HANDLER (POST)
// ============================================
webhookRouter.post('/', async (req: Request, res: Response) => {
    try {
        // Always respond 200 immediately (WhatsApp requirement)
        res.sendStatus(200);

        // Process webhook asynchronously
        const payload = req.body;
        const io = req.app.get('io');
        await processWebhook(payload, io);
    } catch (error) {
        logger.error('Error handling webhook:', error);
    }
});

// ============================================
// WEBHOOK PROCESSOR
// ============================================
async function processWebhook(payload: any, io: any): Promise<void> {
    try {
        const entry = payload.entry?.[0];
        if (!entry) return;

        const changes = entry.changes?.[0];
        if (!changes) return;

        const value = changes.value;

        // Handle incoming messages
        if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
                await handleIncomingMessage(message, value, io);
            }
        }

        // Handle status updates (delivered, read, etc.)
        if (value.statuses && value.statuses.length > 0) {
            logger.debug('Message status update', { statuses: value.statuses });
        }
    } catch (error) {
        logger.error('Error processing webhook:', error);
    }
}

// ============================================
// INCOMING MESSAGE HANDLER
// ============================================
async function handleIncomingMessage(
    message: WhatsAppMessage,
    value: any,
    io: any
): Promise<void> {
    try {
        const from = message.from;
        const messageId = message.id;

        logger.info('Received WhatsApp message', {
            from,
            type: message.type,
            id: messageId,
        });

        // Mark as read
        await whatsappService.markAsRead(messageId);

        // ==========================================
        // HANDLE SESSION INITIATION
        // ==========================================
        let sessionId: string | null = null;

        if (message.type === 'text' && message.text?.body.startsWith('SESSION:')) {
            sessionId = message.text.body.split('SESSION:')[1].trim();

            // Update session with phone number
            await supabase.from('user_sessions')
                .update({ phone_number: from })
                .eq('id', sessionId);

            // Get business info for personalization
            const { data: sessionData } = await supabase.from('user_sessions')
                .select('business_slug')
                .eq('id', sessionId)
                .single();

            const businessName = sessionData?.business_slug
                ? businessNameMap[sessionData.business_slug] || 'Nuestro Servicio'
                : 'Nuestro Servicio';

            // Send rich visual welcome landing page
            await whatsappService.sendWelcomeLanding(from, businessName);

            logger.info('Welcome landing sent', { from, sessionId, businessName });
            return;
        }

        // ==========================================
        // GET EXISTING SESSION
        // ==========================================
        const { data: sessions } = await supabase.from('user_sessions')
            .select('id, user_id, business_slug')
            .eq('phone_number', from)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1);

        if (!sessions || sessions.length === 0) {
            await whatsappService.sendTextMessage(
                from,
                '👋 ¡Hola! Para comenzar, por favor escanea el código QR del negocio.\n\n¿No tienes el código? Contáctanos para más información.'
            );
            return;
        }

        sessionId = sessions[0].id;
        const customerId = sessions[0].user_id;

        if (!sessionId) {
            logger.error('Session ID is null after lookup', { from });
            await whatsappService.sendTextMessage(
                from,
                '❌ Error al procesar tu mensaje. Por favor escanea el código QR nuevamente.'
            );
            return;
        }

        // ==========================================
        // ROUTE MESSAGE BY TYPE
        // ==========================================
        switch (message.type) {
            case 'text':
                await handleTextMessage(message, sessionId, customerId, from);
                break;

            case 'video':
                await handleVideoMessage(message, sessionId, customerId, from);
                break;

            case 'image':
                await handleImageMessage(message, sessionId, customerId, from);
                break;

            case 'audio':
                await handleAudioMessage(message, sessionId, customerId, from);
                break;

            case 'button':
            case 'interactive':
                await handleInteractiveMessage(message, sessionId, customerId, from);
                break;

            default:
                logger.warn('Unsupported message type', { type: message.type, from });
                await whatsappService.sendTextMessage(
                    from,
                    'Formato no soportado. Por favor envía texto, imágenes o videos.'
                );
        }

        // ==========================================
        // EMIT TO WEBSOCKET
        // ==========================================
        if (io) {
            io.to(sessionId).emit('whatsapp_message', {
                from,
                type: message.type,
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        logger.error('Error handling incoming message:', error);

        // Send user-friendly error message
        try {
            await whatsappService.sendTextMessage(
                message.from,
                '❌ Disculpa, ocurrió un error. Por favor intenta de nuevo en unos momentos.'
            );
        } catch (sendError) {
            logger.error('Failed to send error message', sendError);
        }
    }
}

// ============================================
// TEXT MESSAGE HANDLER
// ============================================
async function handleTextMessage(
    message: WhatsAppMessage,
    sessionId: string,
    customerId: string,
    from: string
): Promise<void> {
    try {
        const userMessage = message.text?.body || '';
        const lowerMessage = userMessage.toLowerCase();

        // Command detection
        if (lowerMessage === 'menu' || lowerMessage === 'inicio' || lowerMessage === 'start') {
            await whatsappService.sendInteractiveLandingMenu(from, 'Nuestro Servicio');
            return;
        }

        // Booking intent detection
        if (lowerMessage.includes('agendar') ||
            lowerMessage.includes('cita') ||
            lowerMessage.includes('reserva') ||
            lowerMessage.includes('appointment')) {
            await whatsappService.sendButtonMessage(
                from,
                '📅 ¿Cuándo te gustaría agendar?',
                [
                    { id: 'book_today', title: 'Hoy' },
                    { id: 'book_tomorrow', title: 'Mañana' },
                    { id: 'book_later', title: 'Otro día' },
                ]
            );
            return;
        }

        // Emergency detection
        if (lowerMessage.includes('emergencia') || lowerMessage.includes('urgente')) {
            await whatsappService.sendTextMessage(
                from,
                '🚨 **SERVICIO DE EMERGENCIA**\n\nTe conectaremos con un técnico inmediatamente.\n\n📞 Llama ahora: +1-800-EMERGENCY\n\nO describe tu emergencia y te contactamos en menos de 5 minutos.'
            );
            return;
        }

        // Process with self-learning chatbot
        logger.info('Processing with chatbot', { sessionId, messageLength: userMessage.length });

        const result = await chatService.processMessage(sessionId, userMessage, 'es');

        // Send AI response
        await whatsappService.sendTextMessage(from, result.response);

        // If low confidence, ask for feedback and offer menu
        if (result.confidence < 0.6) {
            await whatsappService.sendButtonMessage(
                from,
                '¿Te fue útil esta respuesta?',
                [
                    { id: `feedback_yes_${result.id}`, title: '✅ Sí' },
                    { id: `feedback_no_${result.id}`, title: '❌ No' },
                    { id: 'show_menu', title: '📋 Ver Menú' },
                ]
            );
        }
    } catch (error) {
        logger.error('Error handling text message:', error);
        await whatsappService.sendTextMessage(
            from,
            '❌ Disculpa, hubo un error procesando tu mensaje. Por favor intenta de nuevo.'
        );
    }
}

// ============================================
// VIDEO MESSAGE HANDLER
// ============================================
async function handleVideoMessage(
    message: WhatsAppMessage,
    sessionId: string,
    customerId: string,
    from: string
): Promise<void> {
    try {
        await whatsappService.sendTextMessage(
            from,
            '📹 Recibido! Analizando tu video...\n\nEsto tomará unos 10-15 segundos.'
        );

        const videoId = message.video?.id;
        if (!videoId) {
            await whatsappService.sendTextMessage(
                from,
                '❌ Error: No se pudo obtener el video. Por favor intenta de nuevo.'
            );
            return;
        }

        // Download video from WhatsApp
        logger.info('Downloading video', { videoId, from });
        const videoBuffer = await whatsappService.downloadMedia(videoId);

        // Upload and start analysis
        const result = await videoService.uploadAndAnalyze(
            videoBuffer,
            customerId,
            undefined,
            message.video?.caption
        );

        // Wait for analysis to complete
        let analysis;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            analysis = await videoService.getVideoAnalysis(result.videoId);

            if (analysis.status === 'analyzed' || analysis.status === 'failed') {
                break;
            }
            attempts++;
        }

        if (!analysis || analysis.status === 'failed') {
            await whatsappService.sendTextMessage(
                from,
                '❌ No pudimos analizar el video. Por favor intenta de nuevo o envía una descripción del problema.'
            );
            return;
        }

        if (analysis.status === 'analyzed' && analysis.analysis_result) {
            const a = analysis.analysis_result;

            const responseMessage = `
✅ **ANÁLISIS COMPLETADO**

🔧 **Problema Detectado:** ${a.description}

📊 **Detalles:**
⚠️ Severidad: ${translateSeverity(a.severity)}
⏱️ Urgencia: ${translateUrgency(a.urgency)}
⏳ Duración estimada: ${a.estimatedDuration}

💰 **Costo Estimado:** $${a.estimatedCost.min} - $${a.estimatedCost.max} ${a.estimatedCost.currency}

**🛠️ Acciones Recomendadas:**
${a.suggestedActions.map((action: string, i: number) => `${i + 1}. ${action}`).join('\n')}
      `.trim();

            await whatsappService.sendTextMessage(from, responseMessage);

            // Offer next steps
            await whatsappService.sendButtonMessage(
                from,
                '¿Qué te gustaría hacer ahora?',
                [
                    { id: 'book_service', title: '📅 Agendar Visita' },
                    { id: 'get_quote', title: '💰 Cotización' },
                    { id: 'ask_question', title: '❓ Preguntar' },
                ]
            );

            logger.info('Video analysis sent', { videoId: result.videoId, from });
        } else {
            await whatsappService.sendTextMessage(
                from,
                '⏳ El análisis está en progreso. Te notificaremos cuando esté listo (puede tomar hasta 1 minuto).'
            );
        }
    } catch (error) {
        logger.error('Error handling video:', error);
        await whatsappService.sendTextMessage(
            from,
            '❌ Hubo un error analizando el video. Por favor intenta de nuevo o contáctanos directamente.'
        );
    }
}

// ============================================
// IMAGE MESSAGE HANDLER
// ============================================
async function handleImageMessage(
    message: WhatsAppMessage,
    sessionId: string,
    customerId: string,
    from: string
): Promise<void> {
    try {
        await whatsappService.sendTextMessage(
            from,
            '📸 Imagen recibida.\n\nPara un análisis más preciso, por favor envía un video corto (10-30 segundos) mostrando el problema desde diferentes ángulos.'
        );
    } catch (error) {
        logger.error('Error handling image message:', error);
    }
}

// ============================================
// AUDIO MESSAGE HANDLER
// ============================================
async function handleAudioMessage(
    message: WhatsAppMessage,
    sessionId: string,
    customerId: string,
    from: string
): Promise<void> {
    try {
        await whatsappService.sendTextMessage(
            from,
            '🎤 Audio recibido.\n\nActualmente no procesamos mensajes de voz. Por favor escribe tu consulta o envía un video del problema.'
        );
    } catch (error) {
        logger.error('Error handling audio message:', error);
    }
}

// ============================================
// INTERACTIVE MESSAGE HANDLER
// ============================================
async function handleInteractiveMessage(
    message: WhatsAppMessage,
    sessionId: string,
    customerId: string,
    from: string
): Promise<void> {
    try {
        const buttonReply = message.interactive?.button_reply;
        const listReply = message.interactive?.list_reply;

        const replyId = buttonReply?.id || listReply?.id;

        if (!replyId) {
            logger.warn('Interactive message without reply ID', { message });
            return;
        }

        logger.info('Processing interactive reply', { replyId, from });

        // ==========================================
        // MAIN MENU OPTIONS
        // ==========================================

        // Services
        if (replyId.startsWith('services_')) {
            const service = replyId.split('_')[1];
            await handleServiceSelection(from, service);
            return;
        }

        // Actions
        if (replyId.startsWith('action_')) {
            const action = replyId.split('_')[1];
            await handleActionSelection(from, action, customerId);
            return;
        }

        // Info
        if (replyId.startsWith('info_')) {
            const info = replyId.split('_')[1];
            await handleInfoRequest(from, info);
            return;
        }

        // ==========================================
        // FEEDBACK HANDLING
        // ==========================================
        if (replyId.startsWith('feedback_')) {
            const parts = replyId.split('_');
            if (parts.length < 3) {
                logger.warn('Invalid feedback reply ID format', { replyId });
                return;
            }

            const helpful = parts[1];
            const chatId = parts[2];

            await chatService.submitFeedback(chatId, {
                helpful: helpful === 'yes',
            });

            await whatsappService.sendTextMessage(
                from,
                helpful === 'yes'
                    ? '¡Gracias por tu feedback! 😊\n\nEscribe "menu" si necesitas algo más.'
                    : 'Gracias por tu feedback. Un agente humano te contactará pronto. 👨‍💼'
            );
            return;
        }

        // ==========================================
        // BOOKING FLOW
        // ==========================================
        if (replyId.startsWith('book_')) {
            const date = replyId === 'book_today'
                ? new Date().toISOString().split('T')[0]
                : replyId === 'book_tomorrow'
                    ? new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    : new Date(Date.now() + 172800000).toISOString().split('T')[0];

            const slots = await bookingService.getAvailableSlots('default-business', date);

            if (slots.length > 0) {
                await whatsappService.sendListMessage(
                    from,
                    `📅 Horarios disponibles para ${formatDate(date)}:`,
                    'Ver Horarios',
                    [{
                        title: 'Horarios Disponibles',
                        rows: slots.slice(0, 10).map((slot: string) => ({
                            id: `slot_${date}_${slot}`,
                            title: slot,
                            description: 'Disponible',
                        })),
                    }]
                );
            } else {
                await whatsappService.sendTextMessage(
                    from,
                    `❌ No hay horarios disponibles para ${formatDate(date)}.\n\nPor favor selecciona otra fecha o contáctanos directamente.`
                );
            }
            return;
        }

        // ==========================================
        // SLOT SELECTION
        // ==========================================
        if (replyId.startsWith('slot_')) {
            const parts = replyId.split('_');
            if (parts.length < 3) {
                logger.warn('Invalid slot reply ID format', { replyId });
                return;
            }

            const date = parts[1];
            const time = parts[2];

            const booking = await bookingService.createBooking({
                customerId,
                businessId: 'default-business',
                serviceType: 'general',
                scheduledDate: date,
                scheduledTime: time,
            });

            await bookingService.confirmBooking(booking.id);
            await bookingService.sendBookingConfirmation(booking.id, from);

            logger.info('Booking confirmed', { bookingId: booking.id, from });
            return;
        }

        // ==========================================
        // QUICK ACTIONS
        // ==========================================
        if (replyId === 'book_service') {
            await whatsappService.sendButtonMessage(
                from,
                '📅 ¿Cuándo te gustaría agendar la visita?',
                [
                    { id: 'book_today', title: 'Hoy' },
                    { id: 'book_tomorrow', title: 'Mañana' },
                    { id: 'book_later', title: 'Otro día' },
                ]
            );
            return;
        }

        if (replyId === 'get_quote') {
            await whatsappService.sendTextMessage(
                from,
                '💰 **SOLICITUD DE COTIZACIÓN**\n\nPor favor describe:\n\n1. ¿Qué servicio necesitas?\n2. ¿Cuál es el problema específico?\n3. ¿Ubicación del servicio?\n\nEnvía toda la información en un mensaje y te responderemos con una cotización detallada.'
            );
            return;
        }

        if (replyId === 'ask_question') {
            await whatsappService.sendTextMessage(
                from,
                '❓ **PREGUNTAS**\n\n¿Qué te gustaría saber?\n\nPuedes preguntar sobre:\n• Servicios y precios\n• Horarios de atención\n• Áreas de servicio\n• Garantías\n• Y mucho más...\n\nEscribe tu pregunta y te responderé.'
            );
            return;
        }

        if (replyId === 'show_menu') {
            await whatsappService.sendInteractiveLandingMenu(from, 'Nuestro Servicio');
            return;
        }

        // Send video guide
        if (replyId === 'send_video') {
            await whatsappService.sendTextMessage(
                from,
                '📹 **GUÍA PARA ENVIAR VIDEO**\n\n1. Graba un video corto (10-30 seg)\n2. Muestra el problema claramente\n3. Graba desde diferentes ángulos\n4. Incluye una descripción como caption\n\nEnvía el video y lo analizaremos automáticamente!'
            );
            return;
        }

    } catch (error) {
        logger.error('Error handling interactive message:', error);
        await whatsappService.sendTextMessage(
            from,
            '❌ Error procesando tu selección. Por favor intenta de nuevo o escribe "menu".'
        );
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleServiceSelection(from: string, service: string): Promise<void> {
    const serviceInfo: Record<string, string> = {
        plumbing: '🚿 **PLOMERÍA**\n\nServicios:\n• Reparación de fugas\n• Instalación de tuberías\n• Destapado de drenajes\n• Emergencias 24/7\n\n💰 Desde $99\n\n¿Qué necesitas?',
        electrical: '⚡ **ELECTRICIDAD**\n\nServicios:\n• Instalaciones eléctricas\n• Reparación de circuitos\n• Iluminación\n• Emergencias 24/7\n\n💰 Desde $89\n\n¿Qué necesitas?',
        hvac: '❄️ **CLIMATIZACIÓN**\n\nServicios:\n• Reparación de AC\n• Instalación de sistemas\n• Mantenimiento preventivo\n• Emergencias\n\n💰 Desde $129\n\n¿Qué necesitas?',
    };

    await whatsappService.sendTextMessage(from, serviceInfo[service] || 'Servicio no disponible');
}

async function handleActionSelection(from: string, action: string, customerId: string): Promise<void> {
    if (action === 'quote') {
        await whatsappService.sendTextMessage(
            from,
            '💰 **COTIZACIÓN RÁPIDA**\n\nDescribe el trabajo:\n1. Tipo de servicio\n2. Detalles del problema\n3. Ubicación\n\nTe enviaremos un presupuesto en minutos!'
        );
    } else if (action === 'booking') {
        await whatsappService.sendButtonMessage(
            from,
            '📅 ¿Cuándo te gustaría agendar?',
            [
                { id: 'book_today', title: 'Hoy' },
                { id: 'book_tomorrow', title: 'Mañana' },
                { id: 'book_later', title: 'Otro día' },
            ]
        );
    } else if (action === 'emergency') {
        await whatsappService.sendTextMessage(
            from,
            '🚨 **EMERGENCIA**\n\n📞 Llama ahora:\n+1-800-EMERGENCY\n\nO describe tu emergencia y te contactamos en 5 minutos.'
        );
    }
}

async function handleInfoRequest(from: string, info: string): Promise<void> {
    const infoContent: Record<string, string> = {
        prices: '💰 **LISTA DE PRECIOS**\n\n🚿 Plomería: $99-$299\n⚡ Electricidad: $89-$259\n❄️ HVAC: $129-$399\n\nVisita de diagnóstico: $49\n(Se descuenta del servicio)\n\nEmergencias: +$100',
        hours: '🕐 **HORARIOS**\n\nLun-Vie: 8am - 8pm\nSábados: 9am - 6pm\nDomingos: 10am - 4pm\n\n🚨 Emergencias: 24/7',
        about: '👋 **SOBRE NOSOTROS**\n\n✓ 15 años de experiencia\n✓ Técnicos certificados\n✓ Garantía en todos los servicios\n✓ Respuesta rápida\n✓ Precios justos\n\n🏆 5⭐ en Google',
    };

    await whatsappService.sendTextMessage(from, infoContent[info] || 'Información no disponible');
}

function translateSeverity(severity: string): string {
    const map: Record<string, string> = {
        minor: 'Menor',
        moderate: 'Moderada',
        major: 'Mayor',
        emergency: 'Emergencia',
    };
    return map[severity] || severity;
}

function translateUrgency(urgency: string): string {
    const map: Record<string, string> = {
        low: 'Baja',
        medium: 'Media',
        high: 'Alta',
    };
    return map[urgency] || urgency;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return date.toLocaleDateString('es-ES', options);
}

// Business name mapping
const businessNameMap: Record<string, string> = {
    'demo-plumber': 'Plomería Experta',
    'demo': 'Servicio Demo',
    'default': 'Nuestro Servicio',
};


