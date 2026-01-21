import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from './error.middleware.js';

export const authenticate = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            throw new AppError('Not authorized - no token provided', 401, 'NO_TOKEN');
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, avatar_url, subscription_tier')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            throw new AppError('Not authorized - user not found', 401, 'USER_NOT_FOUND');
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof AppError) {
            next(error);
        } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            next(new AppError('Not authorized - invalid token', 401, 'INVALID_TOKEN'));
        } else {
            next(error);
        }
    }
};

export const requireSubscription = (requiredTier) => {
    return (req, res, next) => {
        const tierLevels = { free: 0, pro: 1 };
        const userLevel = tierLevels[req.user.subscription_tier] || 0;
        const requiredLevel = tierLevels[requiredTier] || 0;

        if (userLevel < requiredLevel) {
            return next(new AppError(
                `This feature requires a ${requiredTier} subscription`,
                403,
                'SUBSCRIPTION_REQUIRED'
            ));
        }

        next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { data: user } = await supabaseAdmin
                .from('users')
                .select('id, email, full_name, avatar_url, subscription_tier')
                .eq('id', decoded.userId)
                .single();

            if (user) {
                req.user = user;
            }
        }

        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};
