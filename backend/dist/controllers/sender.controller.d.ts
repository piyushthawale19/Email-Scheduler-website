import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiResponse, SenderResponse } from '../types';
/**
 * Sender Controller
 *
 * Manages email senders (multi-sender support)
 */
export declare const createSenderSchema: z.ZodObject<{
    email: z.ZodString;
    name: z.ZodString;
    smtpHost: z.ZodOptional<z.ZodString>;
    smtpPort: z.ZodOptional<z.ZodNumber>;
    smtpUser: z.ZodOptional<z.ZodString>;
    smtpPass: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    isDefault: boolean;
    smtpHost?: string | undefined;
    smtpPort?: number | undefined;
    smtpUser?: string | undefined;
    smtpPass?: string | undefined;
}, {
    name: string;
    email: string;
    smtpHost?: string | undefined;
    smtpPort?: number | undefined;
    smtpUser?: string | undefined;
    smtpPass?: string | undefined;
    isDefault?: boolean | undefined;
}>;
export declare const updateSenderSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    smtpHost: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    smtpPort: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    smtpUser: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    smtpPass: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isDefault: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPass?: string | null | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
}, {
    name?: string | undefined;
    smtpHost?: string | null | undefined;
    smtpPort?: number | null | undefined;
    smtpUser?: string | null | undefined;
    smtpPass?: string | null | undefined;
    isDefault?: boolean | undefined;
    isActive?: boolean | undefined;
}>;
/**
 * Get all senders for current user
 */
export declare const getSenders: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse[]>>) => Promise<void>;
/**
 * Create a new sender
 */
export declare const createSender: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse>>) => Promise<void>;
/**
 * Update a sender
 */
export declare const updateSender: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse>>) => Promise<void>;
/**
 * Delete a sender
 */
export declare const deleteSender: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
declare const _default: {
    getSenders: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse[]>>) => Promise<void>;
    createSender: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse>>) => Promise<void>;
    updateSender: (req: AuthenticatedRequest, res: Response<ApiResponse<SenderResponse>>) => Promise<void>;
    deleteSender: (req: AuthenticatedRequest, res: Response<ApiResponse>) => Promise<void>;
};
export default _default;
//# sourceMappingURL=sender.controller.d.ts.map