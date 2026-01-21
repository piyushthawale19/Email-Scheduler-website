import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { SendEmailOptions, SendEmailResult, SMTPConfig } from '../types';

// Cache for transporter instances (one per sender)
const transporterCache = new Map<string, Transporter>();

/**
 * Creates or retrieves a cached nodemailer transporter
 */
const getTransporter = async (smtpConfig?: SMTPConfig): Promise<Transporter> => {
    // Use provided config or default Ethereal config
    const configToUse: SMTPConfig = smtpConfig || {
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass,
        },
    };

    const cacheKey = `${configToUse.host}:${configToUse.port}:${configToUse.auth.user}`;

    // Return cached transporter if exists
    if (transporterCache.has(cacheKey)) {
        return transporterCache.get(cacheKey)!;
    }

    // If no Ethereal credentials, create a test account
    if (!configToUse.auth.user || !configToUse.auth.pass) {
        console.log('⚠️ No SMTP credentials found, creating Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        configToUse.host = 'smtp.ethereal.email';
        configToUse.port = 587;
        configToUse.secure = false;
        configToUse.auth = {
            user: testAccount.user,
            pass: testAccount.pass,
        };
        console.log(`📧 Ethereal test account created: ${testAccount.user}`);
    }

    // Create new transporter
    const transporter = nodemailer.createTransport({
        host: configToUse.host,
        port: configToUse.port,
        secure: configToUse.secure,
        auth: configToUse.auth,
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, // 1 second between messages
        rateLimit: 10, // 10 messages per rateDelta
    });

    // Verify connection
    try {
        await transporter.verify();
        console.log(`✅ SMTP transporter verified: ${configToUse.host}:${configToUse.port}`);
        transporterCache.set(cacheKey, transporter);
    } catch (error) {
        console.error('❌ SMTP transporter verification failed:', error);
        throw error;
    }

    return transporter;
};

/**
 * Send an email using the provided options
 */
export const sendEmail = async (
    options: SendEmailOptions,
    smtpConfig?: SMTPConfig
): Promise<SendEmailResult> => {
    try {
        const transporter = await getTransporter(smtpConfig);

        const mailOptions = {
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || stripHtml(options.html),
        };

        const info = await transporter.sendMail(mailOptions);

        // Get preview URL for Ethereal emails
        const previewUrl = nodemailer.getTestMessageUrl(info);

        console.log(`📧 Email sent successfully:`);
        console.log(`   To: ${options.to}`);
        console.log(`   Subject: ${options.subject}`);
        console.log(`   Message ID: ${info.messageId}`);
        if (previewUrl) {
            console.log(`   Preview URL: ${previewUrl}`);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: previewUrl ? String(previewUrl) : undefined,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to send email to ${options.to}:`, errorMessage);

        return {
            success: false,
            error: errorMessage,
        };
    }
};

/**
 * Strip HTML tags from a string
 */
const stripHtml = (html: string): string => {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
};

/**
 * Close all cached transporters
 */
export const closeTransporters = (): void => {
    for (const [key, transporter] of transporterCache.entries()) {
        transporter.close();
        transporterCache.delete(key);
    }
    console.log('📧 All SMTP transporters closed');
};

export default {
    sendEmail,
    closeTransporters,
};
