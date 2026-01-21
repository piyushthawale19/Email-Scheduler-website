"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const email_worker_1 = require("./email.worker");
const redis_1 = require("../config/redis");
const database_1 = require("../config/database");
const config_1 = require("../config");
/**
 * Worker Entry Point
 *
 * This file starts the BullMQ worker process.
 * It can be run separately from the main API server.
 *
 * Usage: npm run worker
 */
console.log('='.repeat(50));
console.log('📧 Email Scheduler Worker');
console.log('='.repeat(50));
console.log(`Environment: ${config_1.config.env}`);
console.log(`Worker Concurrency: ${config_1.config.worker.concurrency}`);
console.log(`Max Emails/Hour: ${config_1.config.rateLimit.maxEmailsPerHour}`);
console.log(`Max Emails/Hour/Sender: ${config_1.config.rateLimit.maxEmailsPerHourPerSender}`);
console.log('='.repeat(50));
// Create the worker
const worker = (0, email_worker_1.createEmailWorker)();
// Graceful shutdown handlers
const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    try {
        // Close worker
        await worker.close();
        console.log('✅ Worker closed');
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
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
console.log('🚀 Worker started and listening for jobs...');
//# sourceMappingURL=index.js.map