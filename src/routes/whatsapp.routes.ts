import { Router } from 'express';
import WhatsAppController from '../controllers/WhatsAppController';

const router = Router();

/**
 * @route POST /api/whatsapp/webhook
 * @desc Process webhook events from messaging providers
 * @access Public
 */
router.post('/webhook', WhatsAppController.processWebhook);

/**
 * @route POST /api/whatsapp/send
 * @desc Send a WhatsApp message
 * @access Protected
 */
router.post('/send', WhatsAppController.sendMessage);

/**
 * @route POST /api/whatsapp/sessions
 * @desc Create a new WhatsApp session (Wasender only)
 * @access Protected
 */
router.post('/sessions', WhatsAppController.createSession);

/**
 * @route POST /api/whatsapp/provider
 * @desc Set the active messaging provider
 * @access Protected
 */
router.post('/provider', WhatsAppController.setProvider);

/**
 * @route GET /api/whatsapp/provider
 * @desc Get the current messaging provider
 * @access Protected
 */
router.get('/provider', WhatsAppController.getProvider);

export default router; 