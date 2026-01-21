import { JWTPayload, UserResponse } from '../types';
import { User } from '@prisma/client';
/**
 * Auth Service
 *
 * Handles JWT token management, user creation/retrieval, and session management.
 */
/**
 * Generate a JWT token for a user
 */
export declare const generateToken: (user: User) => string;
/**
 * Verify a JWT token and return the payload
 */
export declare const verifyToken: (token: string) => JWTPayload | null;
/**
 * Find or create a user from Google OAuth profile
 */
export declare const findOrCreateGoogleUser: (profile: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}) => Promise<User>;
/**
 * Get user by ID
 */
export declare const getUserById: (userId: string) => Promise<User | null>;
/**
 * Create a session for a user
 */
export declare const createSession: (userId: string, token: string) => Promise<void>;
/**
 * Validate a session token
 */
export declare const validateSession: (token: string) => Promise<User | null>;
/**
 * Delete a session (logout)
 */
export declare const deleteSession: (token: string) => Promise<void>;
/**
 * Clean up expired sessions
 */
export declare const cleanupExpiredSessions: () => Promise<number>;
/**
 * Transform user to response format (exclude sensitive data)
 */
export declare const toUserResponse: (user: User) => UserResponse;
declare const _default: {
    generateToken: (user: User) => string;
    verifyToken: (token: string) => JWTPayload | null;
    findOrCreateGoogleUser: (profile: {
        id: string;
        email: string;
        name: string;
        avatar?: string;
    }) => Promise<User>;
    getUserById: (userId: string) => Promise<User | null>;
    createSession: (userId: string, token: string) => Promise<void>;
    validateSession: (token: string) => Promise<User | null>;
    deleteSession: (token: string) => Promise<void>;
    cleanupExpiredSessions: () => Promise<number>;
    toUserResponse: (user: User) => UserResponse;
};
export default _default;
//# sourceMappingURL=auth.service.d.ts.map