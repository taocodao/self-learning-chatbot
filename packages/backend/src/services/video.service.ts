import { v4 as uuidv4 } from 'uuid';
import { db, supabase } from '@/lib/config/database';
import { logger } from '@/lib/utils/logger';
import { OpenAIService } from './openai.service';
import ffmpeg from 'fluent-ffmpeg';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

ffmpeg.setFfmpegPath(ffmpegPath);

export class VideoService {
    private openaiService: OpenAIService;
    private readonly videoBucket = 'service-videos';
    private readonly thumbnailBucket = 'service-thumbnails';

    constructor() {
        this.openaiService = new OpenAIService();
    }

    async uploadAndAnalyze(
        videoBuffer: Buffer,
        customerId: string,
        businessId?: string,
        caption?: string
    ): Promise<any> {
        const videoId = uuidv4();
        const storagePath = `${customerId}/${videoId}/video.mp4`;

        try {
            logger.info('Starting video upload and analysis', { videoId, customerId });

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(this.videoBucket)
                .upload(storagePath, videoBuffer, {
                    contentType: 'video/mp4',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Save initial record
            const { error: dbError } = await supabase.from('video_uploads').insert({
                id: videoId,
                customer_id: customerId,
                business_id: businessId,
                original_filename: 'whatsapp_video.mp4',
                file_size: videoBuffer.length,
                storage_path: storagePath,
                status: 'processing',
                uploaded_at: new Date().toISOString(),
            });

            if (dbError) throw dbError;

            // Process video asynchronously
            this.processVideo(videoId, videoBuffer, caption).catch(err => {
                logger.error(`Failed to process video ${videoId}:`, err);
            });

            return { videoId, status: 'processing' };
        } catch (error) {
            logger.error('Error uploading video:', error);
            throw error;
        }
    }

    private async processVideo(videoId: string, videoBuffer: Buffer, caption?: string): Promise<void> {
        const tempDir = path.join(os.tmpdir(), videoId);
        const videoPath = path.join(tempDir, 'video.mp4');

        try {
            // Create temp directory
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            fs.writeFileSync(videoPath, videoBuffer);

            // Extract key frames
            const frames = await this.extractFrames(videoPath, 3);

            // Generate thumbnail
            const thumbnailPath = await this.generateThumbnail(videoId, frames[0].path);

            // Analyze frames with GPT-4o Vision
            const analysisResults = await Promise.all(
                frames.map(frame =>
                    this.openaiService.analyzeVideoFrame(
                        frame.base64,
                        `Analyze this home service problem. Identify the issue, severity, and estimated repair cost. ${caption ? `User said: "${caption}"` : ''}`
                    )
                )
            );

            // Synthesize analysis
            const finalAnalysis = this.synthesizeAnalysis(analysisResults, caption);

            // Update database
            const { error } = await supabase.from('video_uploads')
                .update({
                    status: 'analyzed',
                    thumbnail_path: thumbnailPath,
                    analysis_result: finalAnalysis,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', videoId);

            if (error) throw error;

            logger.info(`Video ${videoId} processed successfully`);
        } catch (error) {
            logger.error(`Error processing video ${videoId}:`, error);

            await supabase.from('video_uploads')
                .update({ status: 'failed' })
                .eq('id', videoId);
        } finally {
            // Cleanup
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        }
    }

    private async extractFrames(videoPath: string, count: number): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const frames: any[] = [];
            const outputDir = path.dirname(videoPath);

            ffmpeg(videoPath)
                .on('end', async () => {
                    for (let i = 0; i < count; i++) {
                        const framePath = path.join(outputDir, `frame_${i}.jpg`);

                        if (fs.existsSync(framePath)) {
                            const buffer = fs.readFileSync(framePath);
                            const base64 = buffer.toString('base64');

                            frames.push({ base64, path: framePath });
                        }
                    }

                    resolve(frames);
                })
                .on('error', reject)
                .screenshots({
                    count,
                    folder: outputDir,
                    filename: 'frame_%i.jpg',
                    size: '640x?',
                });
        });
    }

    private async generateThumbnail(videoId: string, framePath: string): Promise<string> {
        const thumbnailBuffer = await sharp(framePath)
            .resize(320, 240, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

        const thumbnailPath = `${videoId}/thumbnail.jpg`;

        const { error } = await supabase.storage
            .from(this.thumbnailBucket)
            .upload(thumbnailPath, thumbnailBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (error) throw error;

        return thumbnailPath;
    }

    private synthesizeAnalysis(analyses: any[], caption?: string): any {
        // Combine all frame analyses
        const problems = analyses.flatMap(a => a.detectedObjects || []);
        const descriptions = analyses.map(a => a.description).filter(Boolean);

        return {
            problemType: analyses[0]?.problemType || 'general_repair',
            severity: analyses[0]?.severity || 'moderate',
            description: descriptions.join(' ') || 'Problem detected in video',
            detectedObjects: [...new Set(problems)],
            suggestedActions: analyses[0]?.suggestedActions || ['Contact a professional'],
            estimatedCost: analyses[0]?.estimatedCost || { min: 100, max: 500, currency: 'USD' },
            estimatedDuration: analyses[0]?.estimatedDuration || '1-2 hours',
            requiredExpertise: analyses[0]?.requiredExpertise || ['General contractor'],
            urgency: analyses[0]?.urgency || 'medium',
            userCaption: caption,
        };
    }

    async getVideoAnalysis(videoId: string): Promise<any> {
        const { data, error } = await supabase.from('video_uploads')
            .select('*')
            .eq('id', videoId)
            .single();

        if (error) throw error;
        return data;
    }
}


