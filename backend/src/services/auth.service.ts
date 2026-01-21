import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/database';
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
export const generateToken = (user: User): string => {
    const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
    };

    return jwt.sign(payload as object, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn as any,
    });
};

/**
 * Verify a JWT token and return the payload
 */
export const verifyToken = (token: string): JWTPayload | null => {
    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        return decoded;
    } catch (error) {
        return null;
    }
};

/**
 * Find or create a user from Google OAuth profile
 */
export const findOrCreateGoogleUser = async (profile: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
}): Promise<User> => {
    // Try to find existing user
    let user = await prisma.user.findUnique({
        where: { googleId: profile.id },
    });

    if (user) {
        // Update user info if changed
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
            },
        });
    } else {
        // Create new user
        user = await prisma.user.create({
            data: {
                googleId: profile.id,
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
            },
        });

        // Create default sender for new user
        await prisma.sender.create({
            data: {
                userId: user.id,
                email: profile.email,
                name: profile.name,
                isDefault: true,
            },
        });

        console.log(`👤 New user created: ${user.email}`);
    }

    return user;
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
    return prisma.user.findUnique({
        where: { id: userId },
    });
};

/**
 * Create a session for a user
 */
export const createSession = async (userId: string, token: string): Promise<void> => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });
};

/**
 * Validate a session token
 */
export const validateSession = async (token: string): Promise<User | null> => {
    const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!session) {
        return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        return null;
    }

    return session.user;
};

/**
 * Delete a session (logout)
 */
export const deleteSession = async (token: string): Promise<void> => {
    await prisma.session.deleteMany({
        where: { token },
    });
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async (): Promise<number> => {
    const result = await prisma.session.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    return result.count;
};

/**
 * Transform user to response format (exclude sensitive data)
 */
export const toUserResponse = (user: User): UserResponse => {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
    };
};

export default {
    generateToken,
    verifyToken,
    findOrCreateGoogleUser,
    getUserById,
    createSession,
    validateSession,
    deleteSession,
    cleanupExpiredSessions,
    toUserResponse,
};
