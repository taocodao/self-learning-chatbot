import { NextRequest, NextResponse } from 'next/server';
import { generateVoiceToken, VoiceAgent } from '@/lib/voice/agent';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
    try {
        const { roomName, participantName } = await request.json();

        if (!roomName || !participantName) {
            return NextResponse.json(
                { success: false, error: 'Missing roomName or participantName' },
                { status: 400 }
            );
        }

        logger.info(`Creating voice session: room=${roomName}, participant=${participantName}`);

        // Generate access token (now async)
        const token = await generateVoiceToken(roomName, participantName);

        // Start voice agent in background
        const agent = new VoiceAgent(roomName, token);
        await agent.connect();

        return NextResponse.json({
            success: true,
            data: {
                roomName,
                token,
                url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
            },
        });
    } catch (error: any) {
        logger.error('Voice join error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
