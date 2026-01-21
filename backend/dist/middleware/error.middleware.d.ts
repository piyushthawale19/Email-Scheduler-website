import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
/**
 * Error Handler Middleware
 *
 * Catches all errors and returns a consistent API response
 */
export declare const errorHandler: (err: Error, req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
/**
 * Not Found Handler
 */
export declare const notFoundHandler: (req: Request, res: Response<ApiResponse>) => void;
/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export declare const asyncHandler: <T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) => (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    errorHandler: (err: Error, req: Request, res: Response<ApiResponse>, next: NextFunction) => void;
    notFoundHandler: (req: Request, res: Response<ApiResponse>) => void;
    asyncHandler: <T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) => (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=error.middleware.d.ts.map