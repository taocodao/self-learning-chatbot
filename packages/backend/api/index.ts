import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import { chatRouter } from '../src/routes/chat.routes';
import { webhookRouter } from '../src/routes/whatsapp.routes';
import { sessionRouter } from '../src/routes/session.routes';
import { examplesRouter } from '../src/routes/examples.routes';
import { healthRouter } from '../src/routes/health.routes';
import { bookingRouter } from '../src/routes/booking.routes';
import { videoRouter } from '../src/routes/video.routes';

// Import middleware
import { errorHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/requestLogger';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(requestLogger);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Backend API Running' }));
app.use('/api/health', healthRouter);
app.use('/api/session', sessionRouter);
app.use('/api/chat', chatRouter);
app.use('/api/examples', examplesRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/video', videoRouter);
app.use('/api/webhook', webhookRouter);

// Error handlers
app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));
app.use(errorHandler);

export default app;
