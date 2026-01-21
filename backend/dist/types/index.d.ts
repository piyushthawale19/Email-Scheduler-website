import { Request } from 'express';
import { User, Email, EmailStatus } from '@prisma/client';
export interface JWTPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
    user?: User;
    userId?: string;
}
export interface GoogleProfile {
    id: string;
    displayName: string;
    emails?: Array<{
        value: string;
        verified?: boolean;
    }>;
    photos?: Array<{
        value: string;
    }>;
}
export interface ScheduleEmailRequest {
    subject: string;
    body: string;
    recipients: string[];
    startTime: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
    senderId?: string;
}
export interface GetEmailsQuery {
    status?: EmailStatus;
    page?: number;
    limit?: number;
    sortBy?: 'scheduledAt' | 'createdAt' | 'sentAt';
    sortOrder?: 'asc' | 'desc';
}
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
export interface EmailJobData {
    emailId: string;
    recipientEmail: string;
    subject: string;
    body: string;
    senderId?: string;
    userId: string;
    batchId?: string;
    attemptNumber: number;
}
export interface EmailJobResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}
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
}
export interface SendEmailResult {
    success: boolean;
    messageId?: string;
    previewUrl?: string;
    error?: string;
}
export interface WorkerConfig {
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
}
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
//# sourceMappingURL=index.d.ts.map