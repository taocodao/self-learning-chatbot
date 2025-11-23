import { Router, Request, Response } from 'express';
import multer from 'multer';
import { VideoService } from '../services/video.service';
import { logger } from '@/lib/utils/logger';
import type { ApiResponse } from '../types';

export const videoRouter = Router();
const videoService = new VideoService();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Upload video
videoRouter.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: 'No video file provided',
            } as ApiResponse);
            return;
        }

        const { customerId, businessId, caption } = req.body;

        if (!customerId) {
            res.status(400).json({
                success: false,
                error: 'customerId is required',
            } as ApiResponse);
            return;
        }

        const result = await videoService.uploadAndAnalyze(
            req.file.buffer,
            customerId,
            businessId,
            caption
        );

        res.status(201).json({
            success: true,
            data: result,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error uploading video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload video',
        } as ApiResponse);
    }
});

// Get video analysis
videoRouter.get('/:videoId', async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;
        const analysis = await videoService.getVideoAnalysis(videoId);

        res.json({
            success: true,
            data: analysis,
        } as ApiResponse);
    } catch (error) {
        logger.error('Error fetching video:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch video',
        } as ApiResponse);
    }
});
