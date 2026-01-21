export class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    // Supabase/PostgreSQL errors
    if (err.code === '23505') {
        error = new AppError('Resource already exists', 409, 'DUPLICATE');
    }

    if (err.code === '23503') {
        error = new AppError('Referenced resource not found', 404, 'NOT_FOUND');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        error = new AppError(messages.join(', '), 400, 'VALIDATION_ERROR');
    }

    // Rate limit errors
    if (err.statusCode === 429) {
        error = new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT');
    }

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        error: {
            message: error.message || 'Internal Server Error',
            code: error.code || 'SERVER_ERROR',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
