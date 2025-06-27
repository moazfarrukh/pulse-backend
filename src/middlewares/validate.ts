import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware to validate request body against a Zod schema.
 * @param schema - The Zod schema to validate against.
 * @returns A middleware function that validates the request body.
 */
export const validate = (schema: ZodSchema<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ message: 'Validation error', errors: error.errors });
            return;
        }
        next(error);
    }
};

/**
 * Middleware to validate request parameters against a Zod schema.
 * @param schema - The Zod schema to validate against.
 * @returns A middleware function that validates the request parameters.
 */
export const validateParams = (schema: ZodSchema<unknown>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedParams = schema.parse(req.params);
        Object.assign(req.params, validatedParams);
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({ message: 'Invalid parameters', errors: error.errors });
            return;
        }
        next(error);
    }
};

export default validate;