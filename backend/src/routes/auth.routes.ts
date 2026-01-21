import { Router } from 'express';
import {
    googleAuth,
    googleCallback,
    getCurrentUser,
    logout,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Auth Routes
 * 
 * POST /auth/google - Initiate Google OAuth
 * GET /auth/google/callback - Google OAuth callback
 * GET /auth/me - Get current user
 * POST /auth/logout - Logout
 */

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// User routes (protected)
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', authenticate, logout);

export default router;
