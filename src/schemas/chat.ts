import { z } from 'zod';
import { VALIDATION_CONSTANTS } from '../constants';

// Create chat schema
export const createChatSchema = z.object({
    is_group: z.boolean(),
    name: z.string().min(VALIDATION_CONSTANTS.CHAT_NAME_MIN_LENGTH).optional(),
    member_ids: z.array(z.number().int().positive()).min(1)
}).refine((data) => {
    // If it's a group chat, name is required
    if (data.is_group && (!data.name || data.name.trim().length === 0)) {
        return false;
    }
    return true;
}, {
    message: 'Group chat name is required',
    path: ['name']
});

// Update chat schema
export const updateChatSchema = z.object({
    name: z.string().min(VALIDATION_CONSTANTS.CHAT_NAME_MIN_LENGTH).optional()
});

// Add members schema
export const addMembersSchema = z.object({
    member_ids: z.array(z.number().int().positive()).min(1)
});

// Remove members schema
export const removeMembersSchema = z.object({
    member_ids: z.array(z.number().int().positive()).min(1)
});

// Chat ID parameter schema
export const chatIdParamSchema = z.object({
    id: z.string().regex(VALIDATION_CONSTANTS.ID_REGEX).transform(Number)
});
