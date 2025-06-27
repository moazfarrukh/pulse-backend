import express from 'express';
import { authMiddleware, validate, validateParams } from '../middlewares';
import { getChatMessages,createMessage } from '../controllers';
import { createMessageSchema,chatIdParamSchema } from '../schemas';

const router = express.Router();

// Get all messages in a chat
router.get('/:chatId', authMiddleware, getChatMessages);

// Create a new message with attachments
router.post('/', authMiddleware, validate(createMessageSchema), createMessage);

export default router;