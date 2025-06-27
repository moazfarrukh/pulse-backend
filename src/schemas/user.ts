import { z } from 'zod';
import { VALIDATION_CONSTANTS } from '../constants';

// Update user schema
export const updateUserSchema = z.object({
    display_name: z.string().min(VALIDATION_CONSTANTS.DISPLAY_NAME_MIN_LENGTH).optional(),
    username: z.string().min(VALIDATION_CONSTANTS.USERNAME_MIN_LENGTH).optional(),
    bio: z.string().optional(),
    phone: z.string().optional()
});

// User ID parameter schema
export const userIdParamSchema = z.object({
    id: z.string().regex(VALIDATION_CONSTANTS.ID_REGEX).transform(Number)
}); 