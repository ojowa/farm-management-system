"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.AppError = void 0;
class AppError extends Error {
    message;
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const handleError = (error) => {
    if (error instanceof AppError) {
        return {
            message: error.message,
            statusCode: error.statusCode,
            code: error.code,
        };
    }
    return {
        message: 'Internal Server Error',
        statusCode: 500,
    };
};
exports.handleError = handleError;
