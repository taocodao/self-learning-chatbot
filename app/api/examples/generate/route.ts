import { NextRequest, NextResponse } from 'next/server';
import { ragService } from '@/lib/services/ragService';
import { perplexityService } from '@/lib/services/perplexityService';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
    try {
        const { category, count = 5, language = 'en' } = await request.json();

        if (!category) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Category is required',
                },
                { status: 400 }
            );
        }

        logger.info(`Generating ${count} examples for ${category}`);

        const examples = await perplexityService.generateExamples(category, count);

        const results = await ragService.addExamplesBatch(
            examples.map((ex) => ({
                question: ex.question,
                answer: ex.answer,
                category,
                language,
                source: 'perplexity' as const,
            }))
        );

        return NextResponse.json({
            success: true,
            data: {
                generated: examples.length,
                added: results.added,
                failed: results.failed,
                examples: examples.slice(0, 3),
            },
        });
    } catch (error: any) {
        logger.error('Example generation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to generate examples',
            },
            { status: 500 }
        );
    }
}
