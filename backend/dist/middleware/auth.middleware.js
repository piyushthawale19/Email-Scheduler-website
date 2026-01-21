"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticate = exports.authenticate = void 0;
const auth_service_1 = require("../services/auth.service");
 
const authenticate = async (req, res, next) => {
    try {
         
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.cookies?.token) {
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
        const payload = (0, auth_service_1.verifyToken)(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token. Please log in again.',
            });
            return;
        }
        // Get user from database
        const user = await (0, auth_service_1.getUserById)(payload.userId);
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
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed. Please try again.',
        });
    }
};
exports.authenticate = authenticate;
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuthenticate = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }
        if (token) {
            const payload = (0, auth_service_1.verifyToken)(token);
            if (payload) {
                const user = await (0, auth_service_1.getUserById)(payload.userId);
                if (user) {
                    req.user = user;
                    req.userId = user.id;
                }
            }
        }
        next();
    }
    catch (error) {
        // Continue without user
        next();
    }
};
exports.optionalAuthenticate = optionalAuthenticate;
exports.default = {
    authenticate: exports.authenticate,
    optionalAuthenticate: exports.optionalAuthenticate,
};
//# sourceMappingURL=auth.middleware.js.map