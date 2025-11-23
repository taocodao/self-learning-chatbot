import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/config/database';
import { logger } from '@/lib/utils/logger';
import { WhatsAppService } from './whatsapp.service';

export class BookingService {
    private whatsappService: WhatsAppService;

    constructor() {
        this.whatsappService = new WhatsAppService();
    }

    async getAvailableSlots(businessId: string, date: string): Promise<any[]> {
        const { data, error } = await supabase.from('bookings')
            .select('scheduled_time')
            .eq('business_id', businessId)
            .eq('scheduled_date', date)
            .in('status', ['confirmed', 'pending']);

        if (error) throw error;

        // Generate all possible slots
        const allSlots = this.generateTimeSlots('09:00', '17:00', 60);
        const bookedTimes = data.map(b => b.scheduled_time);

        return allSlots.filter(slot => !bookedTimes.includes(slot));
    }

    async createBooking(bookingData: {
        customerId: string;
        businessId: string;
        serviceType: string;
        scheduledDate: string;
        scheduledTime: string;
        numberOfPeople?: number;
        specialRequests?: string;
    }): Promise<any> {
        const confirmationCode = this.generateConfirmationCode();

        const booking = {
            id: uuidv4(),
            ...bookingData,
            confirmation_code: confirmationCode,
            status: 'pending',
            deposit_paid: false,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('bookings')
            .insert(booking)
            .select()
            .single();

        if (error) throw error;

        logger.info('Booking created', { bookingId: data.id, confirmationCode });

        return data;
    }

    async confirmBooking(bookingId: string): Promise<void> {
        const { error } = await supabase.from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId);

        if (error) throw error;

        logger.info('Booking confirmed', { bookingId });
    }

    async sendBookingConfirmation(bookingId: string, customerPhone: string): Promise<void> {
        const { data: booking, error } = await supabase.from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

        if (error) throw error;

        const message = `
✅ RESERVA CONFIRMADA

📋 Código: ${booking.confirmation_code}
📅 Fecha: ${booking.scheduled_date}
⏰ Hora: ${booking.scheduled_time}
🏢 Servicio: ${booking.service_type}

Recibirás un recordatorio antes de tu cita.
    `.trim();

        await this.whatsappService.sendTextMessage(customerPhone, message);
    }

    private generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
        const slots: string[] = [];
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes < endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const minutes = currentMinutes % 60;
            slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            currentMinutes += intervalMinutes;
        }

        return slots;
    }

    private generateConfirmationCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}


