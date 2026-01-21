"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUserResponse = exports.cleanupExpiredSessions = exports.deleteSession = exports.validateSession = exports.createSession = exports.getUserById = exports.findOrCreateGoogleUser = exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../config/database");
/**
 * Auth Service
 *
 * Handles JWT token management, user creation/retrieval, and session management.
 */
/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
    };
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
        expiresIn: config_1.config.jwt.expiresIn,
    });
};
exports.generateToken = generateToken;
/**
 * Verify a JWT token and return the payload
 */
const verifyToken = (token) => {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        return decoded;
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
/**
 * Find or create a user from Google OAuth profile
 */
const findOrCreateGoogleUser = async (profile) => {
    // Try to find existing user
    let user = await database_1.prisma.user.findUnique({
        where: { googleId: profile.id },
    });
    if (user) {
        // Update user info if changed
        user = await database_1.prisma.user.update({
            where: { id: user.id },
            data: {
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
            },
        });
    }
    else {
        // Create new user
        user = await database_1.prisma.user.create({
            data: {
                googleId: profile.id,
                email: profile.email,
                name: profile.name,
                avatar: profile.avatar,
            },
        });
        // Create default sender for new user
        await database_1.prisma.sender.create({
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
exports.findOrCreateGoogleUser = findOrCreateGoogleUser;
/**
 * Get user by ID
 */
const getUserById = async (userId) => {
    return database_1.prisma.user.findUnique({
        where: { id: userId },
    });
};
exports.getUserById = getUserById;
/**
 * Create a session for a user
 */
const createSession = async (userId, token) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    await database_1.prisma.session.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });
};
exports.createSession = createSession;
/**
 * Validate a session token
 */
const validateSession = async (token) => {
    const session = await database_1.prisma.session.findUnique({
        where: { token },
        include: { user: true },
    });
    if (!session) {
        return null;
    }
    // Check if session is expired
    if (session.expiresAt < new Date()) {
        await database_1.prisma.session.delete({ where: { id: session.id } });
        return null;
    }
    return session.user;
};
exports.validateSession = validateSession;
/**
 * Delete a session (logout)
 */
const deleteSession = async (token) => {
    await database_1.prisma.session.deleteMany({
        where: { token },
    });
};
exports.deleteSession = deleteSession;
/**
 * Clean up expired sessions
 */
const cleanupExpiredSessions = async () => {
    const result = await database_1.prisma.session.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });
    return result.count;
};
exports.cleanupExpiredSessions = cleanupExpiredSessions;
/**
 * Transform user to response format (exclude sensitive data)
 */
const toUserResponse = (user) => {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
    };
};
exports.toUserResponse = toUserResponse;
exports.default = {
    generateToken: exports.generateToken,
    verifyToken: exports.verifyToken,
    findOrCreateGoogleUser: exports.findOrCreateGoogleUser,
    getUserById: exports.getUserById,
    createSession: exports.createSession,
    validateSession: exports.validateSession,
    deleteSession: exports.deleteSession,
    cleanupExpiredSessions: exports.cleanupExpiredSessions,
    toUserResponse: exports.toUserResponse,
};
//# sourceMappingURL=auth.service.js.map