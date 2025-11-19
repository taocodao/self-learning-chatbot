import { NextRequest, NextResponse } from 'next/server';
import { ragService } from '@/lib/services/ragService';
import { ExampleCreateSchema } from '@/lib/models/schemas';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = ExampleCreateSchema.parse(body);

        const exampleId = await ragService.addExample(
            validatedData.question,
            validatedData.answer,
            validatedData.category,
            validatedData.language,
            validatedData.source
        );

        if (!exampleId) {
            throw new Error('Failed to create example');
        }

        return NextResponse.json(
            {
                success: true,
                data: { id: exampleId },
            },
            { status: 201 }
        );
    } catch (error: any) {
        logger.error('Example creation error:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid example data',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 400 }
        );
    }
}
