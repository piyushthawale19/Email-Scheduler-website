import { Router } from 'express';
import {
    getSenders,
    createSender,
    updateSender,
    deleteSender,
} from '../controllers/sender.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Sender Routes
 * 
 * All routes are protected and require authentication.
 * 
 * GET /senders - Get all senders
 * POST /senders - Create new sender
 * PUT /senders/:id - Update sender
 * DELETE /senders/:id - Delete sender
 */

// Apply authentication to all routes
router.use(authenticate);

// CRUD operations
router.get('/', getSenders);
router.post('/', createSender);
router.put('/:id', updateSender);
router.delete('/:id', deleteSender);

export default router;
