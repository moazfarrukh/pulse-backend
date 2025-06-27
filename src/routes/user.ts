import express from 'express';
import { authMiddleware, validate, validateParams } from '../middlewares';
import { 
getAllUsers, 
getUserById, 
getCurrentUser, 
updateUser, 
updateUserById, 
deleteUser, 
deleteCurrentUser,
uploadAvatar
} from '../controllers/user';
import uploadAvatarMiddleware from '../middlewares/uploadAvatar';
import { updateUserSchema, userIdParamSchema } from '../schemas/user';

const router = express.Router();

// Public routes
router.get('/:id', validateParams(userIdParamSchema), getUserById);
router.get('/me', authMiddleware, getCurrentUser);
router.put('/me', authMiddleware, uploadAvatarMiddleware, validate(updateUserSchema), updateUser);
router.delete('/me', authMiddleware, deleteCurrentUser);
router.get('/', getAllUsers);

// Avatar upload endpoint
router.post('/upload-avatar', authMiddleware, uploadAvatarMiddleware, uploadAvatar);

// Admin routes
router.put('/:id', authMiddleware, validateParams(userIdParamSchema), validate(updateUserSchema), updateUserById);
router.delete('/:id', authMiddleware, validateParams(userIdParamSchema), deleteUser);

export default router;