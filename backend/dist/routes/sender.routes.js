"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sender_controller_1 = require("../controllers/sender.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
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
router.use(auth_middleware_1.authenticate);
// CRUD operations
router.get('/', sender_controller_1.getSenders);
router.post('/', sender_controller_1.createSender);
router.put('/:id', sender_controller_1.updateSender);
router.delete('/:id', sender_controller_1.deleteSender);
exports.default = router;
//# sourceMappingURL=sender.routes.js.map