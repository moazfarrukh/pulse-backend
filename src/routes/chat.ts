import { Router } from 'express';
import { authMiddleware, validate, validateParams } from '../middlewares';
import {
getUserChats,
getChatById,
createChat,
createDirectChat,
updateChat,
addMembers,
removeMembers,
leaveChat,
deleteChat,
getChatMembers,
getUnjoinedChats
} from '../controllers/chat';
import {
    createChatSchema,
    updateChatSchema,
    addMembersSchema,
    removeMembersSchema,
    chatIdParamSchema,
} from '../schemas/chat';
import { userIdParamSchema } from '../schemas';

const router = Router();

// Apply authentication middleware to all chat routes
router.use(authMiddleware);

// Get all chats for current user
// Get all chats for current user
router.get('/', getUserChats);

// Get chats that user hasn't joined
router.get('/unjoined', getUnjoinedChats);

// Get specific chat by ID
router.get('/:id', validateParams(chatIdParamSchema), getChatById);

// Create a new chat
router.post('/', validate(createChatSchema), createChat);

// Create or get a direct chat with another user
router.post('/direct/:userId', validateParams(userIdParamSchema), createDirectChat);

// Update chat (name, etc.)
router.put('/:id', validateParams(chatIdParamSchema), validate(updateChatSchema), updateChat);

router.get('/:id/members', validateParams(chatIdParamSchema), getChatMembers);
// Add members to a chat
router.post('/:id/members', validateParams(chatIdParamSchema), validate(addMembersSchema), addMembers);

// Remove members from a chat
router.delete('/:id/members', validateParams(chatIdParamSchema), validate(removeMembersSchema), removeMembers);

// Leave a chat
router.delete('/:id/leave', validateParams(chatIdParamSchema), leaveChat);

// Delete a chat (creator only)
router.delete('/:id', validateParams(chatIdParamSchema), deleteChat);

export default router;