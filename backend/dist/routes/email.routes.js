"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_1 = require("../controllers/email.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.use(auth_middleware_1.authenticate);
// Scheduling
router.post('/schedule', email_controller_1.scheduleEmails);
// Retrieval
router.get('/scheduled', email_controller_1.getScheduledEmails);
router.get('/sent', email_controller_1.getSentEmails);
router.get('/stats', email_controller_1.getEmailStats);
router.get('/:id', email_controller_1.getEmailById);
// Management
router.delete('/:id', email_controller_1.cancelEmail);
exports.default = router;
//# sourceMappingURL=email.routes.js.map