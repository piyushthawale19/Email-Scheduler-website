import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse, EmailResponse, ScheduleEmailResponse } from '../types';
/**
 * Email Scheduling Controller
 *
 * Handles email scheduling, retrieval, and status management.
 */
export declare const scheduleEmailSchema: z.ZodObject<{
    subject: z.ZodString;
    body: z.ZodString;
    recipients: z.ZodArray<z.ZodString, "many">;
    startTime: z.ZodString;
    delayBetweenEmails: z.ZodDefault<z.ZodNumber>;
    hourlyLimit: z.ZodDefault<z.ZodNumber>;
    senderId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subject: string;
    body: string;
    startTime: string;
    delayBetweenEmails: number;
    hourlyLimit: number;
    recipients: string[];
    senderId?: string | undefined;
}, {
    subject: string;
    body: string;
    startTime: string;
    recipients: string[];
    senderId?: string | undefined;
    delayBetweenEmails?: number | undefined;
    hourlyLimit?: number | undefined;
}>;
export declare const getEmailsQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["SCHEDULED", "PROCESSING", "SENT", "FAILED", "RATE_LIMITED"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["scheduledAt", "createdAt", "sentAt"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortBy: "createdAt" | "scheduledAt" | "sentAt";
    sortOrder: "asc" | "desc";
    status?: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "RATE_LIMITED" | undefined;
}, {
    status?: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "RATE_LIMITED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: "createdAt" | "scheduledAt" | "sentAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
/**
 * Schedule emails
 */
export declare const scheduleEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<ScheduleEmailResponse>>) => Promise<void>;
/**
 * Get scheduled emails
 */
export declare const getScheduledEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse[]>>) => Promise<void>;
/**
 * Get sent emails
 */
export declare const getSentEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse[]>>) => Promise<void>;
/**
 * Get email statistics
 */
export declare const getEmailStats: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
/**
 * Get single email by ID
 */
export declare const getEmailById: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse>>) => Promise<void>;
/**
 * Cancel a scheduled email
 */
export declare const cancelEmail: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
declare const _default: {
    scheduleEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<ScheduleEmailResponse>>) => Promise<void>;
    getScheduledEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse[]>>) => Promise<void>;
    getSentEmails: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse[]>>) => Promise<void>;
    getEmailStats: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
    getEmailById: (req: AuthenticatedRequest, res: Response<ApiResponse<EmailResponse>>) => Promise<void>;
    cancelEmail: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
};
export default _default;
//# sourceMappingURL=email.controller.d.ts.map