import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Import shared utilities
import { supabase } from './lib/config/database';
import logger from './lib/utils/logger';


// Import routes
import { chatRouter } from './routes/chat.routes';
import { webhookRouter } from './routes/whatsapp.routes';
import { sessionRouter } from './routes/session.routes';
import { examplesRouter } from './routes/examples.routes';
import { healthRouter } from './routes/health.routes';
import { bookingRouter } from './routes/booking.routes';
import { videoRouter } from './routes/video.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import types
import type { ApiResponse } from './types';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface ServerConfig {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    whatsappPhoneId: string;
}

class Server {
    private app: Application;
    private httpServer: ReturnType<typeof createServer>;
    private io: SocketIOServer;
    private config: ServerConfig;

    constructor() {
        this.config = {
            port: parseInt(process.env.PORT || '4000'),
            nodeEnv: process.env.NODE_ENV || 'development',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        };

        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: this.config.frontendUrl,
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        // Security
        this.app.use(helmet());

        // CORS
        this.app.use(cors({
            origin: this.config.frontendUrl,
            credentials: true,
        }));

        // Logging
        if (this.config.nodeEnv === 'development') {
            this.app.use(morgan('dev'));
        }
        this.app.use(requestLogger);

        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Make io and supabase accessible in routes
        this.app.set('io', this.io);
        this.app.set('supabase', supabase);
    }

    private setupRoutes(): void {
        // Health check
        this.app.use('/health', healthRouter);

        // API routes
        this.app.use('/api/session', sessionRouter);
        this.app.use('/api/chat', chatRouter);
        this.app.use('/api/examples', examplesRouter);
        this.app.use('/api/booking', bookingRouter);
        this.app.use('/api/video', videoRouter);

        // WhatsApp webhook
        this.app.use('/webhook', webhookRouter);

        // 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
            } as ApiResponse);
        });
    }

    private setupWebSocket(): void {
        this.io.on('connection', (socket) => {
            logger.info(`WebSocket client connected: ${socket.id}`);

            const sessionId = socket.handshake.query.sessionId as string;

            if (sessionId) {
                socket.join(sessionId);
                logger.info(`Client joined session: ${sessionId}`);
            }

            socket.on('typing', (data: { sessionId: string }) => {
                if (data.sessionId) {
                    socket.to(data.sessionId).emit('user_typing', {
                        socketId: socket.id,
                        timestamp: new Date().toISOString(),
                    });
                }
            });

            socket.on('stop_typing', (data: { sessionId: string }) => {
                if (data.sessionId) {
                    socket.to(data.sessionId).emit('user_stop_typing', {
                        socketId: socket.id,
                    });
                }
            });

            socket.on('disconnect', () => {
                logger.info(`WebSocket client disconnected: ${socket.id}`);
            });
        });

        logger.info('✓ WebSocket server initialized');
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', { promise, reason });
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully...');
            this.httpServer.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
    }

    public async start(): Promise<void> {
        try {
            // Test Supabase connection
            const { data, error } = await supabase
                .from('examples')
                .select('count')
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            logger.info('✓ Supabase database connected');

            // Start HTTP server
            this.httpServer.listen(this.config.port, () => {
                logger.info(`✓ Server running on port ${this.config.port}`);
                logger.info(`✓ Environment: ${this.config.nodeEnv}`);
                logger.info(`✓ Frontend URL: ${this.config.frontendUrl}`);
                logger.info(`✓ WebSocket server ready`);
                logger.info(`✓ Self-learning chatbot initialized`);
            });
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    public getIO(): SocketIOServer {
        return this.io;
    }
}

// Start server
const server = new Server();
server.start();

export default Server;
export { server };
