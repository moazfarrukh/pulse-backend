import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config'; 
import { userService } from '../services';
import { User } from '../types/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Check if cookie exists

        const { token } = req.cookies;
            
        if (!token) {
            res.status(401).json({ message: 'Authentication required' });
        }

        if (!config.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in config');
        }

        // Verify the token
        const decoded = jwt.verify(token, config.JWT_SECRET);
        // Type guard to ensure decoded is an object with userId
        if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
            // Set the user info in request object
            const user = await userService.getUserById(decoded.userId);
            if (!user) {
                res.status(401).json({ message: 'User not found' });
            }
            req.user = user as User;
            // Continue to the next middleware or route handler
            next();
        } else {
            res.status(401).json({ message: 'Invalid token payload' });
        }
    } catch {
        // Token verification failed or other error
        res.status(401).json({ message: 'Invalid or expired token detected' });
    }
};

export default authMiddleware;