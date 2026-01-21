import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

/**
 * Error Handler Middleware
 * 
 * Catches all errors and returns a consistent API response
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
): void => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Determine status code
    let statusCode = 500;
    let message = 'Internal server error';

    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
    } else if (err.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
    } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Not found';
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
};

/**
 * Not Found Handler
 */
export const notFoundHandler = (
    req: Request,
    res: Response<ApiResponse>
): void => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`,
    });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = <T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default {
    errorHandler,
    notFoundHandler,
    asyncHandler,
};
