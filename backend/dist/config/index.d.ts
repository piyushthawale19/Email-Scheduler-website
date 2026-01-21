export declare const config: {
    env: string;
    port: number;
    frontendUrl: string;
    databaseUrl: string;
    redis: {
        host: string;
        port: number;
        password: string | undefined;
        maxRetriesPerRequest: null;
        enableReadyCheck: boolean;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    session: {
        secret: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        callbackUrl: string;
    };
    worker: {
        concurrency: number;
        maxRetries: number;
        retryDelay: number;
    };
    rateLimit: {
        maxEmailsPerHour: number;
        maxEmailsPerHourPerSender: number;
        delayBetweenEmailsMs: number;
    };
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        pass: string;
    };
};
export default config;
 