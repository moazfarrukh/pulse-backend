import { Router } from 'express';
import { signUp, login, logout, getCurrentUser } from '../controllers';
import { loginSchema, signupSchema } from '../schemas/auth';
import { authMiddleware, validate } from '../middlewares';

const router = Router();

// Sign up route
router.post('/signup', validate(signupSchema), signUp);

// Login route
router.post('/login', validate(loginSchema), login);
router.get('/logout', logout);

router.get('/me', authMiddleware, getCurrentUser);

// Export the router

export default router;