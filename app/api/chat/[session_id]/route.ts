import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/config/database';
import { logger } from '@/lib/utils/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: { session_id: string } }
) {
    try {
        const { session_id } = params;

        const { data, error } = await supabase
            .from('chat_logs')
            .select('*')
            .eq('session_id', session_id)
            .order('timestamp', { ascending: true });

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: data || [],
            count: data?.length || 0,
        });
    } catch (error: any) {
        logger.error('History fetch error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch history',
            },
            { status: 500 }
        );
    }
}
