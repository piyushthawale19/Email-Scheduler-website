"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
/**
 * Auth Routes
 *
 * POST /auth/google - Initiate Google OAuth
 * GET /auth/google/callback - Google OAuth callback
 * GET /auth/me - Get current user
 * POST /auth/logout - Logout
 */
// Google OAuth
router.get('/google', auth_controller_1.googleAuth);
router.get('/google/callback', auth_controller_1.googleCallback);
// User routes (protected)
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.getCurrentUser);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map