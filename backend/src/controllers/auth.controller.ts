import { Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { config } from '../config';
import {
    findOrCreateGoogleUser,
    generateToken,
    createSession,
    deleteSession,
    toUserResponse,
} from '../services/auth.service';
import { AuthenticatedRequest, ApiResponse } from '../types';

/**
 * Configure Passport Google Strategy
 */
passport.use(
    new GoogleStrategy(
        {
            clientID: config.google.clientId,
            clientSecret: config.google.clientSecret,
            callbackURL: config.google.callbackUrl,
            scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile: Profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const avatar = profile.photos?.[0]?.value;

                if (!email) {
                    return done(new Error('No email found in Google profile'), undefined);
                }

                const user = await findOrCreateGoogleUser({
                    id: profile.id,
                    email,
                    name: profile.displayName,
                    avatar,
                });

                return done(null, user);
            } catch (error) {
                return done(error as Error, undefined);
            }
        }
    )
);

/**
 * Initiate Google OAuth flow
 */
export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
});

/**
 * Google OAuth callback handler
 */
export const googleCallback = (req: Request, res: Response): void => {
    passport.authenticate('google', { session: false }, async (err, user) => {
        if (err || !user) {
            console.error('Google OAuth error:', err);
            res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
            return;
        }

        try {
            // Generate JWT token
            const token = generateToken(user);

            // Create session in database
            await createSession(user.id, token);

            // Set cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: config.env === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            // Redirect to frontend with token
            res.redirect(`${config.frontendUrl}/dashboard?token=${token}`);
        } catch (error) {
            console.error('Error creating session:', error);
            res.redirect(`${config.frontendUrl}/login?error=session_failed`);
        }
    })(req, res);
};

/**
 * Get current user
 */
export const getCurrentUser = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
): Promise<void> => {
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
            data: toUserResponse(req.user),
        });
    } catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user information',
        });
    }
};

/**
 * Logout user
 */
export const logout = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
): Promise<void> => {
    try {
        // Get token from header or cookie
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            await deleteSession(token);
        }

        // Clear cookie
        res.clearCookie('token', {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: 'lax',
        });

        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout',
        });
    }
};

export default {
    googleAuth,
    googleCallback,
    getCurrentUser,
    logout,
};
