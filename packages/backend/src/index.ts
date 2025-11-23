import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

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

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app: Application = express();

// Security
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
}));

// Logging
app.use(requestLogger);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/session', sessionRouter);
app.use('/api/chat', chatRouter);
app.use('/api/examples', examplesRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/video', videoRouter);
app.use('/api/webhook', webhookRouter);

// Root health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Backend API running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
    });
});

// Error handler
app.use(errorHandler);

// Export for Vercel
export default app;
