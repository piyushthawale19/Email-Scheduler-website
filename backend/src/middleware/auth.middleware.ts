import { Response, NextFunction } from 'express';
import { verifyToken, getUserById } from '../services/auth.service';
import { AuthenticatedRequest, ApiResponse } from '../types';

/**
 * Authentication Middleware
 * 
 * Verifies JWT token from Authorization header or cookies
 * and attaches user to request object.
 */
export const authenticate = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>,
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from Authorization header or cookies
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Authentication required. Please log in.',
            });
            return;
        }

        // Verify token
        const payload = verifyToken(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token. Please log in again.',
            });
            return;
        }

        // Get user from database
        const user = await getUserById(payload.userId);
        if (!user) {
            res.status(401).json({
                success: false,
                error: 'User not found. Please log in again.',
            });
            return;
        }

        // Attach user to request
        req.user = user;
        req.userId = user.id;

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed. Please try again.',
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuthenticate = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            const payload = verifyToken(token);
            if (payload) {
                const user = await getUserById(payload.userId);
                if (user) {
                    req.user = user;
                    req.userId = user.id;
                }
            }
        }

        next();
    } catch (error) {
        // Continue without user
        next();
    }
};

export default {
    authenticate,
    optionalAuthenticate,
};
