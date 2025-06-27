import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import UserService from '../services/user';
import { User } from '../types/user';
import { AUTH_CONSTANTS, HTTP_CONSTANTS, UPLOAD_CONSTANTS } from '../constants';

// Get all users
const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await UserService.getAllUsers();
        
        // Remove passwords from response
        const usersWithoutPasswords = users.map(user => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json(usersWithoutPasswords);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Get user by ID
const getUserById = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);

        if (Number.isNaN(userId)) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'Invalid user ID' });
            return;
        }

        const user = await UserService.getUserById(userId);
        
        if (!user) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.USER_NOT_FOUND });
            return;
        }
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json(userWithoutPassword);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Get current user profile
const getCurrentUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        const user = await UserService.getUserById(userId);
        
        if (!user) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.USER_NOT_FOUND });
            return;
        }
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json(userWithoutPassword);
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Update user profile
const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        const { email, display_name, username, password, phone, avatar_url, bio } = req.body;
        
        // Check if email is already taken by another user
        const existingUserByEmail = await UserService.getUserByEmail(email);
        if (existingUserByEmail && existingUserByEmail.id !== userId) {
            res.status(HTTP_CONSTANTS.STATUS.CONFLICT).json({ message: HTTP_CONSTANTS.MESSAGES.EMAIL_ALREADY_EXISTS });
            return;
        }

        // Prepare update data
        const updateData: Partial<User> = {
            email,
            display_name,
            username,
            phone,
            bio
        };

        // Handle avatar URL - either from form data or from uploaded file
        if (req.file) {
            // If a file was uploaded, use the actual file path
            // Construct full URL with server base URL
            const serverUrl = process.env[UPLOAD_CONSTANTS.SERVER_HOST_ENV] || UPLOAD_CONSTANTS.DEFAULT_SERVER_HOST;
            const avatarUrl = `${serverUrl}/${UPLOAD_CONSTANTS.AVATARS_DIR}/${req.file.filename}`;
            updateData.avatar_url = avatarUrl;
        } else if (avatar_url) {
            // If avatar_url was provided in form data, use it
            updateData.avatar_url = avatar_url;
        }

        // Hash password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, AUTH_CONSTANTS.SALT_ROUNDS);
        }

        await UserService.updateUser(userId, updateData);
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ 
            message: 'User updated successfully',
            avatar_url: updateData.avatar_url
        });
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Update user by ID (admin function)
const updateUserById = async (req: Request, res: Response) => {
    try {
        const targetUserId = parseInt(req.params.id, 10);

        const { email, display_name, username, password, phone, avatar_url, bio } = req.body;
        
        // Validate required fields
        if (!email || !display_name || !username) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'Email, display name, and username are required' });
            return;
        }

        // Check if user exists
        const existingUser = await UserService.getUserById(targetUserId);
        if (!existingUser) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.USER_NOT_FOUND });
            return;
        }

        // Check if email is already taken by another user
        const existingUserByEmail = await UserService.getUserByEmail(email);
        if (existingUserByEmail && existingUserByEmail.id !== targetUserId) {
            res.status(HTTP_CONSTANTS.STATUS.CONFLICT).json({ message: HTTP_CONSTANTS.MESSAGES.EMAIL_ALREADY_EXISTS });
            return;
        }

        // Prepare update data
        const updateData: Partial<User> = {
            email,
            display_name,
            username,
            phone,
            avatar_url,
            bio
        };

        // Hash password if provided
        if (password) {
            updateData.password = await bcrypt.hash(password, AUTH_CONSTANTS.SALT_ROUNDS);
        }

        await UserService.updateUser(targetUserId, updateData);
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'User updated successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Delete user (admin function)
const deleteUser = async (req: Request, res: Response) => {
    try {
        const targetUserId = parseInt(req.params.id, 10);

        // Check if user exists
        const existingUser = await UserService.getUserById(targetUserId);
        if (!existingUser) {
            res.status(HTTP_CONSTANTS.STATUS.NOT_FOUND).json({ message: HTTP_CONSTANTS.MESSAGES.USER_NOT_FOUND });
            return;
        }

        await UserService.deleteUser(targetUserId);
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'User deleted successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Delete current user account
const deleteCurrentUser = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        await UserService.deleteUser(userId);
        
        // Clear the authentication cookie
        res.clearCookie('token', {
            httpOnly: AUTH_CONSTANTS.COOKIE_HTTP_ONLY,
            secure: process.env.NODE_ENV === 'production' ? AUTH_CONSTANTS.COOKIE_SECURE_PRODUCTION : false,
            sameSite: AUTH_CONSTANTS.COOKIE_SAME_SITE
        });
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ message: 'Account deleted successfully' });
    } catch {

        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

// Upload avatar
const uploadAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        
        if (!userId) {
            res.status(HTTP_CONSTANTS.STATUS.UNAUTHORIZED).json({ message: HTTP_CONSTANTS.MESSAGES.NOT_AUTHENTICATED });
            return;
        }

        // Check if file was uploaded
        if (!req.file) {
            res.status(HTTP_CONSTANTS.STATUS.BAD_REQUEST).json({ message: 'No file uploaded' });
            return;
        }

        // Here you would typically:
        // 1. Save the file to a storage service (AWS S3, local filesystem, etc.)
        // 2. Get the URL of the uploaded file
        // 3. Update the user's avatar_url in the database
        
        // For now, we'll simulate this by creating a file URL
        // In a real application, you'd upload to cloud storage
        const avatarUrl = `/${UPLOAD_CONSTANTS.AVATARS_DIR}/${req.file.filename}`;
        
        // Update user's avatar_url
        await UserService.updateUserAvatar(userId, avatarUrl);
        
        res.status(HTTP_CONSTANTS.STATUS.OK).json({ 
            message: 'Avatar uploaded successfully',
            avatar_url: avatarUrl
        });
    } catch {
        res.status(HTTP_CONSTANTS.STATUS.INTERNAL_SERVER_ERROR).json({ message: HTTP_CONSTANTS.MESSAGES.SERVER_ERROR });
    }
};

export {
    getAllUsers,
    getUserById,
    getCurrentUser,
    updateUser,
    updateUserById,
    deleteUser,
    deleteCurrentUser,
    uploadAvatar
};
