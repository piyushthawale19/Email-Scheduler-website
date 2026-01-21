import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiResponse } from '../types';
/**
 * Validation Middleware
 *
 * Validates request body against a Zod schema
 */
export declare const validate: <T>(schema: ZodSchema<T>) => (req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
/**
 * Validate query parameters
 */
export declare const validateQuery: <T>(schema: ZodSchema<T>) => (req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
declare const _default: {
    validate: <T>(schema: ZodSchema<T>) => (req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
    validateQuery: <T>(schema: ZodSchema<T>) => (req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=validation.middleware.d.ts.map