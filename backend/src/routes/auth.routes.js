import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Set token cookie
const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    validate
], asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;

    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
            email,
            password_hash: passwordHash,
            full_name: fullName,
            provider: 'email'
        })
        .select('id, email, full_name, avatar_url, subscription_tier')
        .single();

    if (error) {
        throw new AppError('Failed to create user', 500);
    }

    // Create free subscription
    await supabaseAdmin
        .from('subscriptions')
        .insert({
            user_id: user.id,
            plan: 'free',
            status: 'active'
        });

    // Generate token
    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.status(201).json({
        success: true,
        data: {
            user,
            token
        }
    });
}));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
], asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Get user
    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('id, email, password_hash, full_name, avatar_url, subscription_tier, provider')
        .eq('email', email)
        .single();

    if (error || !user) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (user.provider !== 'email') {
        throw new AppError(`Please login with ${user.provider}`, 400, 'WRONG_PROVIDER');
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

    // Generate token
    const token = generateToken(user.id);
    setTokenCookie(res, token);

    // Remove password from response
    delete user.password_hash;

    res.json({
        success: true,
        data: {
            user,
            token
        }
    });
}));

// @route   POST /api/auth/google
// @desc    Google OAuth login/register
// @access  Public
router.post('/google', [
    body('credential').notEmpty().withMessage('Google credential is required'),
    validate
], asyncHandler(async (req, res) => {
    const { credential } = req.body;

    // Decode Google ID token (in production, verify with Google API)
    const base64Url = credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

    const { email, name, picture, sub: googleId } = payload;

    // Check if user exists
    let { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, avatar_url, subscription_tier')
        .eq('email', email)
        .single();

    if (!user) {
        // Create new user
        const { data: newUser, error } = await supabaseAdmin
            .from('users')
            .insert({
                email,
                full_name: name,
                avatar_url: picture,
                provider: 'google',
                provider_id: googleId,
                email_verified: true
            })
            .select('id, email, full_name, avatar_url, subscription_tier')
            .single();

        if (error) {
            throw new AppError('Failed to create user', 500);
        }

        user = newUser;

        // Create free subscription
        await supabaseAdmin
            .from('subscriptions')
            .insert({
                user_id: user.id,
                plan: 'free',
                status: 'active'
            });
    }

    // Update last login
    await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

    const token = generateToken(user.id);
    setTokenCookie(res, token);

    res.json({
        success: true,
        data: {
            user,
            token
        }
    });
}));

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    validate
], asyncHandler(async (req, res) => {
    const { email } = req.body;

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, provider')
        .eq('email', email)
        .single();

    // Always return success to prevent email enumeration
    if (!user || user.provider !== 'email') {
        return res.json({
            success: true,
            message: 'If an account exists, a reset email has been sent'
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await supabaseAdmin
        .from('users')
        .update({
            reset_token: hashedToken,
            reset_token_expires: expires.toISOString()
        })
        .eq('id', user.id);

    // In production, send email with reset link
    // await sendResetEmail(email, resetToken);
    console.log(`Reset token for ${email}: ${resetToken}`);

    res.json({
        success: true,
        message: 'If an account exists, a reset email has been sent',
        // Only in development
        ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
}));

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    validate
], asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, reset_token_expires')
        .eq('reset_token', hashedToken)
        .single();

    if (!user || new Date(user.reset_token_expires) < new Date()) {
        throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await supabaseAdmin
        .from('users')
        .update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expires: null
        })
        .eq('id', user.id);

    res.json({
        success: true,
        message: 'Password reset successful'
    });
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', req.user.id)
        .single();

    res.json({
        success: true,
        data: {
            user: req.user,
            subscription
        }
    });
}));

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, [
    body('fullName').optional().trim().notEmpty(),
    body('avatarUrl').optional().isURL(),
    validate
], asyncHandler(async (req, res) => {
    const { fullName, avatarUrl } = req.body;

    const updates = {};
    if (fullName) updates.full_name = fullName;
    if (avatarUrl) updates.avatar_url = avatarUrl;

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select('id, email, full_name, avatar_url, subscription_tier')
        .single();

    if (error) {
        throw new AppError('Failed to update profile', 500);
    }

    res.json({
        success: true,
        data: { user }
    });
}));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

export default router;
