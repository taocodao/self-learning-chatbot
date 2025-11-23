/**
 * LiveKit SIP Voice Agent - COMPLETE WORKING VERSION
 * ✅ Includes requestFunc for proper agent registration
 * ✅ Fixes Twilio Error 32011 - Request timeout
 * ✅ Compatible with @livekit/agents 1.0.18
 */

import { JobContext, WorkerOptions, cli, JobRequest } from '@livekit/agents';
import {
    AudioFrame,
    AudioSource,
    LocalAudioTrack,
    TrackSource,
    RoomEvent,
    RemoteAudioTrack,
    TrackPublishOptions,
    TrackKind,
    Track
} from '@livekit/rtc-node';
import OpenAI from 'openai';
import { createClient, PrerecordedSchema } from '@deepgram/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ragService } from '../services/ragService';
import { logger } from '../utils/logger';
import 'dotenv/config';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY || '';
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY || '';

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const deepgram = createClient(DEEPGRAM_KEY);
const elevenlabs = new ElevenLabsClient({ apiKey: ELEVENLABS_KEY });

// Voice profiles by language
const LANGUAGES = {
    en: {
        voice: 'Rachel',
        greeting: 'Hello! How can I help you with your home service needs today?'
    },
    es: {
        voice: 'Matilda',
        greeting: '¡Hola! ¿Cómo puedo ayudarle con sus servicios del hogar hoy?'
    },
    fr: {
        voice: 'Charlotte',
        greeting: 'Bonjour! Comment puis-je vous aider avec vos besoins de service à domicile?'
    },
} as const;

type LanguageCode = keyof typeof LANGUAGES;

// Audio configuration
const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BUFFER_DURATION_MS = 2000;
const BUFFER_SIZE_SAMPLES = (SAMPLE_RATE * BUFFER_DURATION_MS) / 1000;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Web ReadableStream to async iterator
 */
function streamToAsyncIterator(stream: ReadableStream) {
    const reader = stream.getReader();
    return {
        async *[Symbol.asyncIterator]() {
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) yield value;
                }
            } finally {
                reader.releaseLock();
            }
        }
    };
}

/**
 * Transcribe audio buffer with Deepgram
 */
async function transcribe(audioBuffer: Buffer): Promise<string | null> {
    try {
        if (audioBuffer.length < 4000) {
            return null;
        }

        const { result } = await deepgram.listen.prerecorded.transcribeFile(
            audioBuffer,
            {
                model: 'nova-2',
                language: 'en',
                detect_language: true,
                punctuate: true,
                diarize: false,
            } as PrerecordedSchema
        );

        const userTranscript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
        return userTranscript && userTranscript.trim().length > 0 ? userTranscript.trim() : null;
    } catch (error) {
        logger.error('Transcription error:', error);
        return null;
    }
}

/**
 * Query RAG backend for response
 */
async function queryRAG(
    message: string,
    language: LanguageCode,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
    try {
        const examples = await ragService.retrieveRelevantExamples(
            message,
            language,
            5,
            0.75
        );

        if (examples.length > 0 && (examples[0]?.similarity ?? 0) > 0.85) {
            logger.info(`Using RAG answer (similarity: ${examples[0]?.similarity?.toFixed(2)})`);
            return examples[0].answer;
        }

        // Otherwise, use OpenAI with context
        const context = examples
            .filter(ex => ex.question && ex.answer)
            .map(ex => `Q: ${ex.question}\nA: ${ex.answer}`)
            .join('\n\n');

        const systemPrompt = context
            ? `You are a helpful home service assistant. Use this context when relevant:\n\n${context}`
            : 'You are a helpful home service assistant.';

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 150,
            temperature: 0.7,
        });

        return completion.choices[0]?.message?.content ||
            'I apologize, I could not process that request.';
    } catch (error) {
        logger.error('RAG query error:', error);
        return 'I apologize for the technical difficulty. Please try again.';
    }
}

/**
 * Convert text to speech and stream to room
 */
async function speak(
    text: string,
    language: LanguageCode,
    audioSource: AudioSource
): Promise<void> {
    try {
        logger.info(`🔊 Speaking: "${text.substring(0, 60)}..."`);

        const audioStream = await elevenlabs.textToSpeech.convert(
            LANGUAGES[language].voice,
            {
                text,
                modelId: 'eleven_multilingual_v2',
                outputFormat: 'pcm_24000',
            }
        );

        const chunks = streamToAsyncIterator(audioStream as any);

        for await (const chunk of chunks) {
            if (chunk && chunk.length > 0) {
                const frame = new AudioFrame(
                    new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2),
                    SAMPLE_RATE,
                    CHANNELS,
                    chunk.byteLength / 2
                );
                await audioSource.captureFrame(frame);
            }
        }

        logger.info('✅ Speech complete');
    } catch (error) {
        logger.error('TTS error:', error);
        throw error;
    }
}

// ============================================================================
// AUDIO PROCESSING (Correct LiveKit API)
// ============================================================================

/**
 * Process incoming audio from remote track
 */
async function processAudioTrack(
    track: RemoteAudioTrack,
    language: LanguageCode,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    audioSource: AudioSource
): Promise<void> {
    logger.info('🎤 Starting audio processing');

    let audioBuffers: Buffer[] = [];
    let samplesCollected = 0;

    try {
        // Access audio frames - RemoteAudioTrack implements AsyncIterable
        for await (const frame of track as any) {
            const frameData = Buffer.from(frame.data.buffer);
            audioBuffers.push(frameData);
            samplesCollected += frameData.length / 2;

            if (samplesCollected >= BUFFER_SIZE_SAMPLES) {
                const combined = Buffer.concat(audioBuffers);
                processUserSpeech(combined, language, conversationHistory, audioSource)
                    .catch(err => logger.error('Speech processing error:', err));

                audioBuffers = [];
                samplesCollected = 0;
            }
        }
    } catch (error) {
        logger.error('Audio stream error:', error);
    }
}

/**
 * Process user speech in background
 */
async function processUserSpeech(
    audioBuffer: Buffer,
    language: LanguageCode,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    audioSource: AudioSource
): Promise<void> {
    try {
        const userTranscript = await transcribe(audioBuffer);
        if (!userTranscript) return;

        logger.info(`👤 User: "${userTranscript}"`);

        const response = await queryRAG(userTranscript, language, history);
        logger.info(`🤖 Agent: "${response}"`);

        await speak(response, language, audioSource);

        history.push(
            { role: 'user', content: userTranscript },
            { role: 'assistant', content: response }
        );
    } catch (error) {
        logger.error('Error processing user speech:', error);
    }
}

// ============================================================================
// MAIN AGENT ENTRYPOINT
// ============================================================================

async function entrypoint(ctx: JobContext): Promise<void> {
    logger.info('============================================================');
    logger.info(`📞 INCOMING CALL - Room: ${ctx.room.name}`);
    logger.info(`    Participant: ${ctx.room.localParticipant?.identity || 'unknown'}`);
    logger.info('============================================================');

    try {
        await ctx.connect();
        logger.info('✅ Connected to room');

        const audioSource = new AudioSource(SAMPLE_RATE, CHANNELS);
        const track = LocalAudioTrack.createAudioTrack('agent-voice', audioSource);

        const publishOptions = new TrackPublishOptions();
        publishOptions.source = TrackSource.SOURCE_MICROPHONE;

        await ctx.room.localParticipant?.publishTrack(track, publishOptions);
        logger.info('✅ Audio track published');

        let language: LanguageCode = 'en';
        const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

        // Send greeting
        await speak(LANGUAGES[language].greeting, language, audioSource);
        logger.info('✅ Greeting sent');
        logger.info('✅ Agent ready and listening for audio');

        // Listen for incoming audio tracks
        ctx.room.on(RoomEvent.TrackSubscribed, async (
            track: Track,
            _publication: any,
            participant: any
        ) => {
            if (track.kind !== TrackKind.KIND_AUDIO) return;
            logger.info(`🎤 Audio track subscribed from ${participant.identity}`);

            // Process audio track in background
            processAudioTrack(
                track as RemoteAudioTrack,
                language,
                conversationHistory,
                audioSource
            ).catch(err => logger.error('Track processing error:', err));
        });

        // Handle disconnection
        ctx.room.once(RoomEvent.Disconnected, () => {
            logger.info('📞 Call ended - Room disconnected');
        });

    } catch (error) {
        logger.error('❌ Agent error:', error);
        throw error;
    }
}

// ============================================================================
// CLI ENTRY POINT WITH REQUEST HANDLER
// ============================================================================

if (require.main === module) {
    // ✅ CRITICAL: This function properly registers the agent name with LiveKit
    const requestFunc = async (req: JobRequest) => {
        try {
            logger.info(`📋 Job request received - Job ID: ${req.job.id}`);
            logger.info(`📋 Room: ${req.job.room?.name || 'unknown'}`);

            // Accept job with explicit agent name and identity
            await req.accept(
                'home-service-agent',  // ← This MUST match your dispatch rule!
                `agent-${req.job.id}`, // Participant identity
            );

            logger.info('✅ Job accepted for agent: home-service-agent');
        } catch (error) {
            logger.error('❌ Job request error:', error);
            await req.reject();
        }
    };

    // Initialize worker with request handler
    cli.runApp(
        new WorkerOptions({
            agent: __filename,
            requestFunc,  // ← CRITICAL: Handles incoming job requests
            agentName: "home-service-agent"
        })
    );
}

export default entrypoint;
