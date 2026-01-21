"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const email_routes_1 = __importDefault(require("./email.routes"));
const sender_routes_1 = __importDefault(require("./sender.routes"));
const router = (0, express_1.Router)();
/**
 * API Routes Index
 *
 * /api/auth - Authentication routes
 * /api/emails - Email scheduling routes
 * /api/senders - Sender management routes
 */
router.use('/auth', auth_routes_1.default);
router.use('/emails', email_routes_1.default);
router.use('/senders', sender_routes_1.default);
// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Email Scheduler API is running',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map