"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validate = void 0;
const zod_1 = require("zod");
/**
 * Validation Middleware
 *
 * Validates request body against a Zod schema
 */
const validate = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    message: errorMessages.join(', '),
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Validation error',
            });
        }
    };
};
exports.validate = validate;
/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                res.status(400).json({
                    success: false,
                    error: 'Invalid query parameters',
                    message: errorMessages.join(', '),
                });
                return;
            }
            res.status(500).json({
                success: false,
                error: 'Validation error',
            });
        }
    };
};
exports.validateQuery = validateQuery;
exports.default = {
    validate: exports.validate,
    validateQuery: exports.validateQuery,
};
//# sourceMappingURL=validation.middleware.js.map