import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AuthenticatedRequest, ApiResponse, SenderResponse } from '../types';

/**
 * Sender Controller
 * 
 * Manages email senders (multi-sender support)
 */

// Validation schemas
export const createSenderSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required').max(100),
    smtpHost: z.string().optional(),
    smtpPort: z.number().int().min(1).max(65535).optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    isDefault: z.boolean().default(false),
});

export const updateSenderSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    smtpHost: z.string().optional().nullable(),
    smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
    smtpUser: z.string().optional().nullable(),
    smtpPass: z.string().optional().nullable(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

/**
 * Get all senders for current user
 */
export const getSenders = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SenderResponse[]>>
): Promise<void> => {
    try {
        const userId = req.userId!;

        const senders = await prisma.sender.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
            ],
        });

        const senderResponses: SenderResponse[] = senders.map((sender) => ({
            id: sender.id,
            email: sender.email,
            name: sender.name,
            isDefault: sender.isDefault,
            isActive: sender.isActive,
        }));

        res.json({
            success: true,
            data: senderResponses,
        });
    } catch (error) {
        console.error('Error getting senders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get senders',
        });
    }
};

/**
 * Create a new sender
 */
export const createSender = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SenderResponse>>
): Promise<void> => {
    try {
        const userId = req.userId!;
        const data = createSenderSchema.parse(req.body);

        // Check if sender email already exists for this user
        const existing = await prisma.sender.findFirst({
            where: {
                userId,
                email: data.email,
            },
        });

        if (existing) {
            res.status(400).json({
                success: false,
                error: 'A sender with this email already exists',
            });
            return;
        }

        // If setting as default, unset other defaults
        if (data.isDefault) {
            await prisma.sender.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        const sender = await prisma.sender.create({
            data: {
                userId,
                email: data.email,
                name: data.name,
                smtpHost: data.smtpHost,
                smtpPort: data.smtpPort,
                smtpUser: data.smtpUser,
                smtpPass: data.smtpPass,
                isDefault: data.isDefault,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.isDefault,
                isActive: sender.isActive,
            },
        });
    } catch (error) {
        console.error('Error creating sender:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create sender',
        });
    }
};

/**
 * Update a sender
 */
export const updateSender = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<SenderResponse>>
): Promise<void> => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const data = updateSenderSchema.parse(req.body);

        // Check if sender exists and belongs to user
        const existing = await prisma.sender.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Sender not found',
            });
            return;
        }

        // If setting as default, unset other defaults
        if (data.isDefault) {
            await prisma.sender.updateMany({
                where: {
                    userId,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
        }

        const sender = await prisma.sender.update({
            where: { id },
            data: {
                name: data.name,
                smtpHost: data.smtpHost,
                smtpPort: data.smtpPort,
                smtpUser: data.smtpUser,
                smtpPass: data.smtpPass,
                isDefault: data.isDefault,
                isActive: data.isActive,
            },
        });

        res.json({
            success: true,
            data: {
                id: sender.id,
                email: sender.email,
                name: sender.name,
                isDefault: sender.isDefault,
                isActive: sender.isActive,
            },
        });
    } catch (error) {
        console.error('Error updating sender:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update sender',
        });
    }
};

/**
 * Delete a sender
 */
export const deleteSender = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse>
): Promise<void> => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        // Check if sender exists and belongs to user
        const existing = await prisma.sender.findFirst({
            where: {
                id,
                userId,
            },
        });

        if (!existing) {
            res.status(404).json({
                success: false,
                error: 'Sender not found',
            });
            return;
        }

        // Don't allow deleting if it's the only sender
        const count = await prisma.sender.count({
            where: { userId },
        });

        if (count === 1) {
            res.status(400).json({
                success: false,
                error: 'Cannot delete the only sender. Create another sender first.',
            });
            return;
        }

        await prisma.sender.delete({
            where: { id },
        });

        // If deleted sender was default, set another as default
        if (existing.isDefault) {
            const firstSender = await prisma.sender.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' },
            });

            if (firstSender) {
                await prisma.sender.update({
                    where: { id: firstSender.id },
                    data: { isDefault: true },
                });
            }
        }

        res.json({
            success: true,
            message: 'Sender deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting sender:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete sender',
        });
    }
};

export default {
    getSenders,
    createSender,
    updateSender,
    deleteSender,
};
