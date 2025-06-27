import { z } from 'zod';
import { VALIDATION_CONSTANTS } from '../constants';

export const signupSchema = z.object({
    email: z.string().email(),
    password: z.string().min(VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH),
    display_name: z.string().min(VALIDATION_CONSTANTS.DISPLAY_NAME_MIN_LENGTH),
    username: z.string().min(VALIDATION_CONSTANTS.USERNAME_MIN_LENGTH),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(VALIDATION_CONSTANTS.PASSWORD_MIN_LENGTH),
});
