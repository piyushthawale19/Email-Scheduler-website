import { createEmailWorker } from './email.worker';
import { closeRedisConnections } from '../config/redis';
import { prisma } from '../config/database';
import { config } from '../config';

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
console.log(`Environment: ${config.env}`);
console.log(`Worker Concurrency: ${config.worker.concurrency}`);
console.log(`Max Emails/Hour: ${config.rateLimit.maxEmailsPerHour}`);
console.log(`Max Emails/Hour/Sender: ${config.rateLimit.maxEmailsPerHourPerSender}`);
console.log('='.repeat(50));

// Create the worker
const worker = createEmailWorker();

// Graceful shutdown handlers
const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
        // Close worker
        await worker.close();
        console.log('✅ Worker closed');

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
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('🚀 Worker started and listening for jobs...');
