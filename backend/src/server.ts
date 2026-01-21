import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { config } from './config';
import { prisma } from './config/database';
import { getRedisClient, closeRedisConnections } from './config/redis';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

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

const app: Express = express();

// ========================
// Middleware Configuration
// ========================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: config.env === 'production' ? undefined : false,
}));

// CORS
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Passport initialization (for Google OAuth)
app.use(passport.initialize());

// ========================
// Routes
// ========================

// API routes
app.use('/api', routes);

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
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ========================
// Server Startup
// ========================

const startServer = async (): Promise<void> => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Test Redis connection
        const redis = getRedisClient();
        await redis.ping();
        console.log('✅ Redis connected');

        // Start server
        app.listen(config.port, () => {
            console.log('');
            console.log('='.repeat(50));
            console.log('📧 Email Scheduler API Server');
            console.log('='.repeat(50));
            console.log(`Environment: ${config.env}`);
            console.log(`Server: http://localhost:${config.port}`);
            console.log(`Frontend: ${config.frontendUrl}`);
            console.log(`API Health: http://localhost:${config.port}/api/health`);
            console.log('='.repeat(50));
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// ========================
// Graceful Shutdown
// ========================

const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        // Close Redis connections
        await closeRedisConnections();
        console.log('✅ Redis connections closed');

        // Close database connection
        await prisma.$disconnect();
        console.log('✅ Database connection closed');

        console.log('👋 Goodbye!');
        process.exit(0);
    } catch (error) {
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

export default app;
