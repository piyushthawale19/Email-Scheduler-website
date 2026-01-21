import { Request } from 'express';
import { User, Sender, Email, EmailStatus } from '@prisma/client';

// ========================
// Auth Types
// ========================
export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
    // user and userId are now extended in Express.Request via express.d.ts
}

export interface GoogleProfile {
    id: string;
    displayName: string;
    emails?: Array<{ value: string; verified?: boolean }>;
    photos?: Array<{ value: string }>;
}

// ========================
// Attachment Types
// ========================
export interface EmailAttachment {
    filename: string;
    size: number;
    mimetype: string;
    path: string; // Path to uploaded file
}

// ========================
// API Request Types
// ========================
export interface ScheduleEmailRequest {
    subject: string;
    body: string;
    recipients: string[];
    startTime: string; // ISO 8601 format
    delayBetweenEmails: number; // in seconds
    hourlyLimit: number;
    senderId?: string;
    attachments?: EmailAttachment[]; // Uploaded attachments
}

export interface GetEmailsQuery {
    status?: EmailStatus;
    page?: number;
    limit?: number;
    sortBy?: 'scheduledAt' | 'createdAt' | 'sentAt';
    sortOrder?: 'asc' | 'desc';
}

// ========================
// API Response Types
// ========================
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    createdAt: Date;
}

export interface EmailResponse {
    id: string;
    recipientEmail: string;
    subject: string;
    body: string;
    scheduledAt: Date;
    sentAt: Date | null;
    status: EmailStatus;
    errorMessage: string | null;
    previewUrl: string | null;
    sender: SenderResponse | null;
    createdAt: Date;
    attachments?: EmailAttachment[] | null; // Email attachments
}

export interface SenderResponse {
    id: string;
    email: string;
    name: string;
    isDefault: boolean;
    isActive: boolean;
}

export interface ScheduleEmailResponse {
    batchId: string;
    totalEmails: number;
    scheduledEmails: Email[];
}

// ========================
// Queue Types
// ========================
export interface EmailJobData {
    emailId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    senderId?: string;
    userId: string;
    batchId?: string;
    attemptNumber: number;
    attachments?: EmailAttachment[]; // Email attachments
}

export interface EmailJobResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}

// ========================
// Rate Limiting Types
// ========================
export interface RateLimitCheck {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    nextAvailableSlot?: Date;
}

export interface RateLimitConfig {
    maxPerHour: number;
    maxPerHourPerSender: number;
}

// ========================
// Email Service Types
// ========================
export interface SMTPConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

export interface SendEmailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[]; // Email attachments
}

export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}

// ========================
// Worker Types
// ========================
export interface WorkerConfig {
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
}

// ========================
// Stats Types
// ========================
export interface EmailStats {
    scheduled: number;
    processing: number;
    sent: number;
    failed: number;
    rateLimited: number;
    total: number;
}

export interface DashboardStats {
    emailStats: EmailStats;
    recentEmails: EmailResponse[];
    hourlyUsage: HourlyUsage[];
}

export interface HourlyUsage {
    hour: string;
    count: number;
}
