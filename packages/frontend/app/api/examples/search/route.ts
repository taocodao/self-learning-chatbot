import { NextRequest, NextResponse } from 'next/server';
import { ragService } from '@/lib/services/ragService';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query');
        const language = searchParams.get('language') || 'en';
        const threshold = parseFloat(searchParams.get('threshold') || '0.75');

        if (!query) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Query parameter is required',
                },
                { status: 400 }
            );
        }

        const examples = await ragService.retrieveRelevantExamples(
            query,
            language,
            5,
            threshold
        );

        return NextResponse.json({
            success: true,
            data: {
                query,
                language,
                threshold,
                examples_found: examples.length,
                examples,
            },
        });
    } catch (error: any) {
        logger.error('Example search error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Search failed',
            },
            { status: 500 }
        );
    }
}
