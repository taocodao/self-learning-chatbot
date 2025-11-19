import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../lib/utils/logger';
import type { ApiResponse } from '../types';

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    logger.error('Error handler caught:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });

    const statusCode = (error as any).statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
        }),
    } as ApiResponse);
}
