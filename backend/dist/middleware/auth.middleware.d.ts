import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
/**
 * Authentication Middleware
 *
 * Verifies JWT token from Authorization header or cookies
 * and attaches user to request object.
 */
export declare const authenticate: (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => Promise<void>;
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export declare const optionalAuthenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    authenticate: (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction) => Promise<void>;
    optionalAuthenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=auth.middleware.d.ts.map