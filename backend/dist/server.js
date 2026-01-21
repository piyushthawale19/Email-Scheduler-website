"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_1 = __importDefault(require("passport"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middleware/error.middleware");
/**
 * Email Scheduler API Server
 *
 * Production-grade Express.js server with:
 * - CORS configuration
 * - Security headers (Helmet)
 * - Request logging (Morgan)
 * - Cookie parsing
 * - Passport authentication
 * - Centralized error handling
 */
const app = (0, express_1.default)();
// ========================
// Middleware Configuration
// ========================
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config_1.config.env === 'production' ? undefined : false,
}));
// CORS
app.use((0, cors_1.default)({
    origin: config_1.config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Request logging
app.use((0, morgan_1.default)(config_1.config.env === 'development' ? 'dev' : 'combined'));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parsing
app.use((0, cookie_parser_1.default)());
// Passport initialization (for Google OAuth)
app.use(passport_1.default.initialize());
// ========================
// Routes
// ========================
// API routes
app.use('/api', routes_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Email Scheduler API',
        version: '1.0.0',
        docs: '/api/health',
    });
});
// ========================
// Error Handling
// ========================
// 404 handler
app.use(error_middleware_1.notFoundHandler);
// Global error handler
app.use(error_middleware_1.errorHandler);
// ========================
// Server Startup
// ========================
const startServer = async () => {
    try {
        // Test database connection
        await database_1.prisma.$connect();
        console.log('✅ Database connected');
        // Test Redis connection
        const redis = (0, redis_1.getRedisClient)();
        await redis.ping();
        console.log('✅ Redis connected');
        // Start server
        app.listen(config_1.config.port, () => {
            console.log('');
            console.log('='.repeat(50));
            console.log('📧 Email Scheduler API Server');
            console.log('='.repeat(50));
            console.log(`Environment: ${config_1.config.env}`);
            console.log(`Server: http://localhost:${config_1.config.port}`);
            console.log(`Frontend: ${config_1.config.frontendUrl}`);
            console.log(`API Health: http://localhost:${config_1.config.port}/api/health`);
            console.log('='.repeat(50));
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
// ========================
// Graceful Shutdown
// ========================
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    try {
        // Close Redis connections
        await (0, redis_1.closeRedisConnections)();
        console.log('✅ Redis connections closed');
        // Close database connection
        await database_1.prisma.$disconnect();
        console.log('✅ Database connection closed');
        console.log('👋 Goodbye!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map