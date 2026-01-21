import { Router } from 'express';
import {
    scheduleEmails,
    getScheduledEmails,
    getSentEmails,
    getEmailStats,
    getEmailById,
    cancelEmail,
    getAttachment,
} from '../controllers/email.controller';
import { authenticate } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * Email Routes
 * 
 * All routes are protected and require authentication.
 * 
 * POST /emails/schedule - Schedule new emails
 * GET /emails/scheduled - Get scheduled emails
 * GET /emails/sent - Get sent emails
 * GET /emails/stats - Get email statistics
 * GET /emails/:id - Get single email
 * DELETE /emails/:id - Cancel scheduled email
 */

// Apply authentication to all routes
router.use(authenticate);

// Scheduling
router.post('/schedule', upload.array('attachments', 10), scheduleEmails);

// Retrieval
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);
router.get('/stats', getEmailStats);
router.get('/:id', getEmailById);
router.get('/:id/attachments/:index', getAttachment);

// Management
router.delete('/:id', cancelEmail);

export default router;
