import { Router } from 'express';
import WebhookController from '../controllers/WebhookController';

const router = Router();

router.get('/whatsapp', WebhookController.verify.bind(WebhookController));
router.post('/whatsapp', WebhookController.handleIncoming.bind(WebhookController));

export default router;
