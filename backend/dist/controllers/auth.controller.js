"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getCurrentUser = exports.googleCallback = exports.googleAuth = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const config_1 = require("../config");
const auth_service_1 = require("../services/auth.service");
/**
 * Configure Passport Google Strategy
 */
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: config_1.config.google.clientId,
    clientSecret: config_1.config.google.clientSecret,
    callbackURL: config_1.config.google.callbackUrl,
    scope: ['profile', 'email'],
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        const avatar = profile.photos?.[0]?.value;
        if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
        }
        const user = await (0, auth_service_1.findOrCreateGoogleUser)({
            id: profile.id,
            email,
            name: profile.displayName,
            avatar,
        });
        return done(null, user);
    }
    catch (error) {
        return done(error, undefined);
    }
}));
exports.googleAuth = passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
});
 
const googleCallback = (req, res) => {
    passport_1.default.authenticate('google', { session: false }, async (err, user) => {
        if (err || !user) {
            console.error('Google OAuth error:', err);
            res.redirect(`${config_1.config.frontendUrl}/login?error=auth_failed`);
            return;
        }
        try {
            const token = (0, auth_service_1.generateToken)(user);
            await (0, auth_service_1.createSession)(user.id, token);
            res.cookie('token', token, {
                httpOnly: true,
                secure: config_1.config.env === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.redirect(`${config_1.config.frontendUrl}/dashboard?token=${token}`);
        }
        catch (error) {
            console.error('Error creating session:', error);
            res.redirect(`${config_1.config.frontendUrl}/login?error=session_failed`);
        }
    })(req, res);
};
exports.googleCallback = googleCallback;
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Not authenticated',
            });
            return;
        }
        res.json({
            success: true,
            data: (0, auth_service_1.toUserResponse)(req.user),
        });
    }
    catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information',
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let token;
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }
        if (token) {
            await (0, auth_service_1.deleteSession)(token);
        }
        res.clearCookie('token', {
            httpOnly: true,
            secure: config_1.config.env === 'production',
            sameSite: 'lax',
        });
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }
    catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout',
        });
    }
};
exports.logout = logout;
exports.default = {
    googleAuth: exports.googleAuth,
    googleCallback: exports.googleCallback,
    getCurrentUser: exports.getCurrentUser,
    logout: exports.logout,
};
//# sourceMappingURL=auth.controller.js.map