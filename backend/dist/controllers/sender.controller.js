"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSender = exports.updateSender = exports.createSender = exports.getSenders = exports.updateSenderSchema = exports.createSenderSchema = void 0;
const zod_1 = require("zod");
const database_1 = require("../config/database");
/**
 * Sender Controller
 *
 * Manages email senders (multi-sender support)
 */
// Validation schemas
exports.createSenderSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    name: zod_1.z.string().min(1, 'Name is required').max(100),
    smtpHost: zod_1.z.string().optional(),
    smtpPort: zod_1.z.number().int().min(1).max(65535).optional(),
    smtpUser: zod_1.z.string().optional(),
    smtpPass: zod_1.z.string().optional(),
    isDefault: zod_1.z.boolean().default(false),
});
exports.updateSenderSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    smtpHost: zod_1.z.string().optional().nullable(),
    smtpPort: zod_1.z.number().int().min(1).max(65535).optional().nullable(),
    smtpUser: zod_1.z.string().optional().nullable(),
    smtpPass: zod_1.z.string().optional().nullable(),
    isDefault: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
/**
 * Get all senders for current user
 */
const getSenders = async (req, res) => {
    try {
        const userId = req.userId;
        const senders = await database_1.prisma.sender.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
            ],
        });
        const senderResponses = senders.map((sender) => ({
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
    }
    catch (error) {
        console.error('Error getting senders:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get senders',
        });
    }
};
exports.getSenders = getSenders;
/**
 * Create a new sender
 */
const createSender = async (req, res) => {
    try {
        const userId = req.userId;
        const data = exports.createSenderSchema.parse(req.body);
        // Check if sender email already exists for this user
        const existing = await database_1.prisma.sender.findFirst({
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
            await database_1.prisma.sender.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        const sender = await database_1.prisma.sender.create({
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
    }
    catch (error) {
        console.error('Error creating sender:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create sender',
        });
    }
};
exports.createSender = createSender;
/**
 * Update a sender
 */
const updateSender = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const data = exports.updateSenderSchema.parse(req.body);
        // Check if sender exists and belongs to user
        const existing = await database_1.prisma.sender.findFirst({
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
            await database_1.prisma.sender.updateMany({
                where: {
                    userId,
                    id: { not: id },
                },
                data: { isDefault: false },
            });
        }
        const sender = await database_1.prisma.sender.update({
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
    }
    catch (error) {
        console.error('Error updating sender:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update sender',
        });
    }
};
exports.updateSender = updateSender;
/**
 * Delete a sender
 */
const deleteSender = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Check if sender exists and belongs to user
        const existing = await database_1.prisma.sender.findFirst({
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
        const count = await database_1.prisma.sender.count({
            where: { userId },
        });
        if (count === 1) {
            res.status(400).json({
                success: false,
                error: 'Cannot delete the only sender. Create another sender first.',
            });
            return;
        }
        await database_1.prisma.sender.delete({
            where: { id },
        });
        // If deleted sender was default, set another as default
        if (existing.isDefault) {
            const firstSender = await database_1.prisma.sender.findFirst({
                where: { userId },
                orderBy: { createdAt: 'asc' },
            });
            if (firstSender) {
                await database_1.prisma.sender.update({
                    where: { id: firstSender.id },
                    data: { isDefault: true },
                });
            }
        }
        res.json({
            success: true,
            message: 'Sender deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting sender:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete sender',
        });
    }
};
exports.deleteSender = deleteSender;
exports.default = {
    getSenders: exports.getSenders,
    createSender: exports.createSender,
    updateSender: exports.updateSender,
    deleteSender: exports.deleteSender,
};
//# sourceMappingURL=sender.controller.js.map