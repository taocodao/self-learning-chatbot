import { Router, Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '../types';

export const bookingRouter = Router();
const bookingService = new BookingService();

// Get available slots
bookingRouter.get('/slots', async (req: Request, res: Response) => {
    try {
        const { businessId, date } = req.query;

        if (!businessId || !date) {
            res.status(400).json({
                success: false,
                error: 'businessId and date are required',
            } as ApiResponse);
            return;
        }

        const slots = await bookingService.getAvailableSlots(
            businessId as string,
            date as string
        );

        res.json({
            success: true,
            data: slots,
            count: slots.length,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching slots:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch slots',
        } as ApiResponse);
    }
});

// Create booking
bookingRouter.post('/', async (req: Request, res: Response) => {
    try {
        const bookingData = req.body;

        const booking = await bookingService.createBooking(bookingData);

        res.status(201).json({
            success: true,
            data: booking,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create booking',
        } as ApiResponse);
    }
});

// Confirm booking
bookingRouter.post('/:bookingId/confirm', async (req: Request, res: Response) => {
    try {
        const { bookingId } = req.params;

        await bookingService.confirmBooking(bookingId);

        res.json({
            success: true,
            message: 'Booking confirmed',
        } as ApiResponse);
    } catch (error) {
        logger.error('Error confirming booking:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to confirm booking',
        } as ApiResponse);
    }
});
