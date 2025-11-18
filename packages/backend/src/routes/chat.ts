import { Router } from 'express';
import ChatController from '../controllers/ChatController';

const router = Router();

router.get('/history/:sessionId', ChatController.getChatHistory.bind(ChatController));
router.post('/message', ChatController.sendMessage.bind(ChatController));

export default router;
