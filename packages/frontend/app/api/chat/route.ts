import { NextRequest, NextResponse } from 'next/server';
import { chatService } from '@/lib/services/chatService';
import { ChatRequestSchema } from '@/lib/models/schemas';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = ChatRequestSchema.parse(body);

        logger.info(`Chat request: "${validatedData.message.substring(0, 50)}..."`);

        const response = await chatService.processMessage(validatedData);

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error: any) {
        logger.error('Chat endpoint error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid request format',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process message',
            },
            { status: 500 }
        );
    }
}
