import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import senderRoutes from './sender.routes';

const router = Router();

/**
 * API Routes Index
 * 
 * /api/auth - Authentication routes
 * /api/emails - Email scheduling routes
 * /api/senders - Sender management routes
 */

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/senders', senderRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Email Scheduler API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
