import express, { Application } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import config from './config';
import database from './database/connection';
import chatRoutes from './routes/chat';
import webhookRoutes from './routes/webhook';
import { errorHandler } from './middleware/errorHandler';
import ConversationModel from './models/Conversation';
import { ApiResponse } from './types';

class Server {
    private app: Application;
    private httpServer: ReturnType<typeof createServer>;
    private io: SocketIOServer;

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: config.frontendUrl,
                methods: ['GET', 'POST'],
            },
        });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    private setupMiddleware(): void {
        this.app.use(helmet());
        this.app.use(cors({ origin: config.frontendUrl }));
        this.app.use(morgan('dev'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Make io accessible in routes
        this.app.set('io', this.io);
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Session creation endpoint
        this.app.post('/api/session/create', async (req, res) => {
            try {
                const { barcodeData } = req.body;

                if (!barcodeData) {
                    res.status(400).json({
                        success: false,
                        error: 'Barcode data is required',
                    } as ApiResponse);
                    return;
                }

                // Create new conversation
                const userId = uuidv4();
                const conversation = await ConversationModel.create(userId, 'web');

                // Store session with barcode
                const query = `
          INSERT INTO user_sessions (barcode_data, session_id, phone_number)
          VALUES ($1, $2, $3)
          RETURNING *
        `;
                await database.query(query, [barcodeData, conversation.id, config.whatsapp.phoneId]);

                res.json({
                    success: true,
                    data: {
                        sessionId: conversation.id,
                        phoneNumber: config.whatsapp.phoneId,
                    },
                } as ApiResponse);
            } catch (error) {
                console.error('Error creating session:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create session',
                } as ApiResponse);
            }
        });

        // WhatsApp initialization
        this.app.post('/api/whatsapp/init', async (req, res) => {
            const { userId } = req.body;

            res.json({
                success: true,
                data: {
                    phoneNumber: config.whatsapp.phoneId,
                    sessionId: userId,
                    apiEndpoint: '/api/whatsapp/send',
                },
            } as ApiResponse);
        });

        // API routes
        this.app.use('/api/chat', chatRoutes);
        this.app.use('/webhook', webhookRoutes);
    }

    private setupWebSocket(): void {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            const sessionId = socket.handshake.query.sessionId as string;
            if (sessionId) {
                socket.join(sessionId);
                console.log(`Client joined session: ${sessionId}`);
            }

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });

            socket.on('typing', () => {
                if (sessionId) {
                    socket.to(sessionId).emit('typing');
                }
            });
        });
    }

    private setupErrorHandling(): void {
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            // Test database connection
            await database.query('SELECT NOW()');
            console.log('✓ Database connected');

            // Start server
            this.httpServer.listen(config.port, () => {
                console.log(`✓ Server running on port ${config.port}`);
                console.log(`✓ Environment: ${config.nodeEnv}`);
                console.log(`✓ Frontend URL: ${config.frontendUrl}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start server
const server = new Server();
server.start();
