import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import shared utilities
import { supabase } from '../../../lib/config/database';
import { logger } from '../../../lib/utils/logger';

// Import routes
import { chatRouter } from './routes/chat.routes';
import { webhookRouter } from './routes/webhook.routes';
import { sessionRouter } from './routes/session.routes';
import { examplesRouter } from './routes/examples.routes';
import { healthRouter } from './routes/health.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import types
import type { ApiResponse } from './types';

// Load environment variables from root
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
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Make io and supabase accessible in routes
        this.app.set('io', this.io);
        this.app.set('supabase', supabase);
    }

    private setupRoutes(): void {
        // Health check
        this.app.use('/health', healthRouter);

        // Session management
        this.app.use('/api/session', sessionRouter);

        // Chat routes
        this.app.use('/api/chat', chatRouter);

        // Examples (RAG knowledge base)
        this.app.use('/api/examples', examplesRouter);

        // WhatsApp webhook
        this.app.use('/webhook', webhookRouter);

        // WhatsApp initialization endpoint (legacy support)
        this.app.post('/api/whatsapp/init', this.handleWhatsAppInit.bind(this));

        // 404 handler
        this.app.use((req: Request, res: Response) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
            } as ApiResponse);
        });
    }

    private async handleWhatsAppInit(req: Request, res: Response): Promise<void> {
        try {
            const { userId, sessionId } = req.body;

            if (!userId && !sessionId) {
                res.status(400).json({
                    success: false,
                    error: 'userId or sessionId is required',
                } as ApiResponse);
                return;
            }

            const finalSessionId = sessionId || userId;

            res.json({
                success: true,
                data: {
                    phoneNumber: this.config.whatsappPhoneId,
                    sessionId: finalSessionId,
                    apiEndpoint: '/api/chat',
                    webhookEndpoint: '/webhook',
                },
            } as ApiResponse);
        } catch (error) {
            logger.error('Error initializing WhatsApp', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initialize WhatsApp',
            } as ApiResponse);
        }
    }

    private setupWebSocket(): void {
        this.io.on('connection', (socket) => {
            logger.info(`WebSocket client connected: ${socket.id}`);

            const sessionId = socket.handshake.query.sessionId as string;

            if (sessionId) {
                socket.join(sessionId);
                logger.info(`Client joined session: ${sessionId}`);

                // Notify other clients in the room
                socket.to(sessionId).emit('user_joined', {
                    socketId: socket.id,
                    timestamp: new Date().toISOString(),
                });
            }

            // Handle typing indicator
            socket.on('typing', (data: { sessionId: string }) => {
                if (data.sessionId) {
                    socket.to(data.sessionId).emit('user_typing', {
                        socketId: socket.id,
                        timestamp: new Date().toISOString(),
                    });
                }
            });

            // Handle stop typing
            socket.on('stop_typing', (data: { sessionId: string }) => {
                if (data.sessionId) {
                    socket.to(data.sessionId).emit('user_stop_typing', {
                        socketId: socket.id,
                    });
                }
            });

            // Handle message acknowledgment
            socket.on('message_received', (data: { messageId: string; sessionId: string }) => {
                socket.to(data.sessionId).emit('message_ack', {
                    messageId: data.messageId,
                    timestamp: new Date().toISOString(),
                });
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                logger.info(`WebSocket client disconnected: ${socket.id}`);
                if (sessionId) {
                    socket.to(sessionId).emit('user_left', {
                        socketId: socket.id,
                        timestamp: new Date().toISOString(),
                    });
                }
            });
        });

        logger.info('✓ WebSocket server initialized');
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', { promise, reason });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Graceful shutdown
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

            if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
                throw error;
            }

            logger.info('✓ Supabase database connected');

            // Start HTTP server
            this.httpServer.listen(this.config.port, () => {
                logger.info(`✓ Server running on port ${this.config.port}`);
                logger.info(`✓ Environment: ${this.config.nodeEnv}`);
                logger.info(`✓ Frontend URL: ${this.config.frontendUrl}`);
                logger.info(`✓ WebSocket server ready`);
                logger.info(`✓ API endpoints available at http://localhost:${this.config.port}/api`);
            });
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    // Public method to get Socket.IO instance
    public getIO(): SocketIOServer {
        return this.io;
    }
}

// Start server
const server = new Server();
server.start();

export default Server;
export { server };
