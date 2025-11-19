import { NextResponse } from 'next/server';
import { ragService } from '@/lib/services/ragService';
import { logger } from '@/lib/utils/logger';

export async function GET() {
    try {
        const stats = await ragService.getStatistics();

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error: any) {
        logger.error('Stats fetch error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch statistics',
            },
            { status: 500 }
        );
    }
}
