/**
 * Voice Agent - TypeScript Implementation (Type-Safe)
 * Integrates with existing RAG chatbot backend
 */

import { Room, RoomEvent, RemoteAudioTrack, RemoteTrack } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { createClient } from '@deepgram/sdk';
import { ElevenLabsClient, stream } from '@elevenlabs/elevenlabs-js';
import { ragService } from '../services/ragService';
import { logger } from '../utils/logger';

// AI Service Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || '');
const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

// Language Configuration
const LANGUAGES = {
    en: { voice: 'Rachel', greeting: 'Hello! How can I help you with your home service needs?' },
    es: { voice: 'Matilda', greeting: '¡Hola! ¿Cómo puedo ayudarle hoy?' },
    fr: { voice: 'Charlotte', greeting: 'Bonjour! Comment puis-je vous aider?' },
} as const;

type LanguageCode = keyof typeof LANGUAGES;

export class VoiceAgent {
    private room: Room;
    private language: LanguageCode = 'en';
    private sessionId: string;
    private conversationHistory: ChatCompletionMessageParam[] = [];

    constructor(private roomName: string, private token: string) {
        this.room = new Room();
        this.sessionId = `voice-${Date.now()}`;
    }

    /**
     * Connect to LiveKit room
     */
    async connect(): Promise<void> {
        const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

        await this.room.connect(livekitUrl, this.token);

        logger.info(`Voice agent connected to room: ${this.roomName}`);

        // Setup event listeners
        this.room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
        this.room.on(RoomEvent.Disconnected, this.handleDisconnected.bind(this));

        // Send greeting
        await this.speak(LANGUAGES[this.language].greeting);
    }

    /**
     * Handle incoming audio tracks
     */
    private async handleTrackSubscribed(
        track: RemoteTrack,
        publication: any,
        participant: any
    ): Promise<void> {
        if (track.kind === 'audio') {
            logger.info('Audio track subscribed from participant');

            // Process audio stream
            await this.processAudio(track as RemoteAudioTrack);
        }
    }

    /**
     * Process audio and convert to text
     */
    private async processAudio(audioTrack: RemoteAudioTrack): Promise<void> {
        try {
            // Create audio buffer from track
            const audioBuffer = await this.getAudioBuffer(audioTrack);

            // Transcribe with Deepgram
            const { result } = await deepgram.listen.prerecorded.transcribeFile(
                audioBuffer,
                {
                    model: 'nova-2',
                    language: 'en',
                    detect_language: true,
                }
            );

            // Type-safe null check
            if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
                logger.warn('No transcription result');
                return;
            }

            const transcript = result.results.channels[0].alternatives[0].transcript;

            if (transcript) {
                logger.info(`User said: ${transcript}`);

                // Detect language with fallback
                const detectedLanguage = (result.results.channels[0].detected_language || 'en') as LanguageCode;
                this.language = detectedLanguage in LANGUAGES ? detectedLanguage : 'en';

                // Query your RAG backend
                const response = await this.queryRagBackend(transcript);

                // Speak response
                await this.speak(response);
            }
        } catch (error) {
            logger.error('Error processing audio:', error);
        }
    }

    /**
     * Query your existing RAG backend
     */
    private async queryRagBackend(message: string): Promise<string> {
        try {
            logger.info(`Querying RAG backend: ${message.substring(0, 50)}...`);

            // Use your existing RAG service directly!
            const examples = await ragService.retrieveRelevantExamples(
                message,
                this.language,
                5,
                0.75
            );

            // If high similarity, use RAG response
            if (examples.length > 0 && (examples[0]?.similarity ?? 0) > 0.85) {
                logger.info(`Using RAG (similarity: ${examples[0].similarity})`);
                return examples[0].answer;
            }

            // Otherwise, use OpenAI with context
            const context = examples
                .filter(ex => ex.question && ex.answer)
                .map(ex => `Q: ${ex.question}\nA: ${ex.answer}`)
                .join('\n\n');

            // Type-safe message array
            const messages: ChatCompletionMessageParam[] = [
                {
                    role: 'system' as const,
                    content: `You are a helpful home service assistant. Use this context if relevant:\n\n${context}`
                },
                ...this.conversationHistory,
                { role: 'user' as const, content: message }
            ];

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 150,
            });

            const response = completion.choices[0]?.message?.content || 'I apologize, I could not process that.';

            // Update conversation history
            this.conversationHistory.push(
                { role: 'user' as const, content: message },
                { role: 'assistant' as const, content: response }
            );

            return response;
        } catch (error) {
            logger.error('RAG query error:', error);
            return 'I apologize for the technical difficulty. Please try again.';
        }
    }

    /**
     * Convert text to speech and play
     */
    private async speak(text: string): Promise<void> {
        try {
            logger.info(`Speaking: ${text.substring(0, 50)}...`);

            // Generate speech with ElevenLabs (correct API)
            const audio = await elevenlabs.textToSpeech.convert(
                LANGUAGES[this.language].voice,
                {
                    text,
                    modelId: 'eleven_multilingual_v2',
                }
            );

            // Publish audio to room
            await this.publishAudio(audio);
        } catch (error) {
            logger.error('TTS error:', error);
        }
    }

    /**
     * Publish audio to LiveKit room
     */
    private async publishAudio(audioData: any): Promise<void> {
        // Convert audio stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of audioData) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        // Create audio track from buffer
        // Note: This is a simplified version. In production, you'd need to:
        // 1. Create an audio track from the buffer
        // 2. Publish it to the room
        // 3. Handle proper audio format conversion

        logger.info(`Publishing ${audioBuffer.length} bytes of audio to room`);

        // TODO: Implement actual audio track publishing
        // This requires creating a LocalAudioTrack and publishing it
    }

    /**
     * Get audio buffer from track
     */
    private async getAudioBuffer(track: RemoteAudioTrack): Promise<Buffer> {
        // This is a placeholder implementation
        // In production, you would:
        // 1. Subscribe to audio frames from the track
        // 2. Buffer them into a format Deepgram can process
        // 3. Return the buffered audio

        logger.warn('getAudioBuffer is not fully implemented');
        return Buffer.from([]);
    }

    /**
     * Handle disconnection
     */
    private handleDisconnected(): void {
        logger.info('Voice agent disconnected from room');
    }

    /**
     * Disconnect agent
     */
    async disconnect(): Promise<void> {
        await this.room.disconnect();
    }
}

/**
 * Generate access token for voice session
 */
export async function generateVoiceToken(roomName: string, participantName: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey-28e5e2192cff101d';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'LVo+CjlGSX7q/dVrpCG3hxETTzR4ryjxxqMzGZeimjs=';

    const token = new AccessToken(apiKey, apiSecret, {
        identity: participantName,
        ttl: '2h',
    });

    token.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
    });

    return token.toJwt();
}
