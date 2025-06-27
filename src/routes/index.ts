import { Router } from 'express';
import authRoutes from './auth';
import chatRoutes from './chat';
import userRoutes from './user';
import messageRoutes from './message';
import { authMiddleware } from '../middlewares/auth';
import { updateUser } from '../controllers/user';
import uploadAvatarMiddleware from '../middlewares/uploadAvatar';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chats', chatRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);

// Direct /users route for frontend updateUserWithFile
router.put('/users', authMiddleware, uploadAvatarMiddleware, updateUser);

export default router;