import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import UserService from '../services/user';
import { config } from '../config';
import { handleSignupError } from '../utils';
import { AUTH_CONSTANTS, HTTP_CONSTANTS } from '../constants';
// Replace with your user model and secret


// Sign Up Controller
const signUp = async (req: Request, res: Response) => {
    const { email, password, display_name, username } = req.body;
 
    try {
        const hashedPassword = await bcrypt.hash(password, AUTH_CONSTANTS.SALT_ROUNDS);
        const userId = await UserService.createUser({
            email,
            password: hashedPassword,
            display_name,
            username,
        });

        if (!config.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in config');
        }

        const token = jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRES_IN });

        res.cookie('token', token, {
            httpOnly: AUTH_CONSTANTS.COOKIE_HTTP_ONLY,
            secure: process.env.NODE_ENV === 'production' ? AUTH_CONSTANTS.COOKIE_SECURE_PRODUCTION : false,
            maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
            sameSite: AUTH_CONSTANTS.COOKIE_SAME_SITE
        });

        res.status(HTTP_CONSTANTS.STATUS.CREATED).json({ message: 'User registered successfully' });
    } catch (error: unknown) {
        const errorResponse = handleSignupError(error);
        res.status(errorResponse.status).json(errorResponse.response);
    }       
};

// Login Controller
const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await UserService.getUserByEmail(email);
    if (!user) {
        res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.INVALID_CREDENTIALS });
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.INVALID_CREDENTIALS });
        return;
    }

    try {
        if (!config.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in config');
        }

        const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: AUTH_CONSTANTS.JWT_EXPIRES_IN });

        res.cookie('token', token, {
            httpOnly: AUTH_CONSTANTS.COOKIE_HTTP_ONLY,
            secure: process.env.NODE_ENV === 'production' ? AUTH_CONSTANTS.COOKIE_SECURE_PRODUCTION : false,
            maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
            sameSite: AUTH_CONSTANTS.COOKIE_SAME_SITE
        });
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Login successful' });
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};
// Logout Controller
const logout = (req: Request, res: Response) => {
    try {
        res.clearCookie('token', {
            httpOnly: AUTH_CONSTANTS.COOKIE_HTTP_ONLY,
            secure: process.env.NODE_ENV === 'production' ? AUTH_CONSTANTS.COOKIE_SECURE_PRODUCTION : false,
            sameSite: AUTH_CONSTANTS.COOKIE_SAME_SITE
        });
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Logout successful' });
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

export { signUp, login, logout };
