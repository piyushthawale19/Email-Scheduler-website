import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Validate required environment variables
const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`Missing required environment variable: ${envVar}`);
        // Don't exit in development for easier debugging
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

export const config = {
    // Server Configuration
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

    // Database
    databaseUrl: process.env.DATABASE_URL!,

    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
    },

    // JWT Configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    // Session Configuration
    session: {
        secret: process.env.SESSION_SECRET || 'default-session-secret',
    },

    // Google OAuth Configuration
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },

    // Worker Configuration
    worker: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.RETRY_DELAY_MS || '5000', 10),
    },

    // Rate Limiting Configuration
    rateLimit: {
        maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '100', 10),
        maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '50', 10),
        delayBetweenEmailsMs: parseInt(process.env.DELAY_BETWEEN_EMAILS_MS || '1000', 10),
    },

    // SMTP Configuration (Ethereal)
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
};

// Freeze config to prevent accidental modifications
Object.freeze(config);
Object.freeze(config.redis);
Object.freeze(config.jwt);
Object.freeze(config.session);
Object.freeze(config.google);
Object.freeze(config.worker);
Object.freeze(config.rateLimit);
Object.freeze(config.smtp);

export default config;
