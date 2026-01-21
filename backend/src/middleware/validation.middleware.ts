import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { ApiResponse } from '../types';

/**
 * Validation Middleware
 * 
 * Validates request body against a Zod schema
 */
export const validate = <T>(schema: ZodSchema<T>) => {
    return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    message: errorMessages.join(', '),
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Validation error',
            });
        }
    };
};

/**
 * Validate query parameters
 */
export const validateQuery = <T>(schema: ZodSchema<T>) => {
    return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
        try {
            schema.parse(req.query);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);

                res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    message: errorMessages.join(', '),
                });
                return;
            }

            res.status(500).json({
                success: false,
                error: 'Validation error',
            });
        }
    };
};

export default {
    validate,
    validateQuery,
};
