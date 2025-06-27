import { z } from 'zod';
import { VALIDATION_CONSTANTS } from '../constants';

// Create message schema
const createMessageSchema = z.object({
    chat_id: z.number().int().positive(),
    content: z.string().min(VALIDATION_CONSTANTS.MESSAGE_CONTENT_MIN_LENGTH).optional()
}).refine((data) => {
    // Either content or attachments should be present
    if (!data.content || data.content.trim().length === 0) {
        return false;
    }
    return true;
}, {
    message: 'Message content is required',
    path: ['content']
});

export default createMessageSchema;

