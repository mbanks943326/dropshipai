import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
    createCheckoutSession,
    createBillingPortalSession,
    cancelSubscription,
    resumeSubscription,
    PLANS
} from '../services/stripe.service.js';
import { getUsageSummary } from '../services/usage.service.js';

const router = express.Router();

// @route   GET /api/subscriptions
// @desc    Get current subscription status
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const usage = await getUsageSummary(req.user.id, req.user.subscription_tier);

    res.json({
        success: true,
        data: {
            subscription: subscription || { plan: 'free', status: 'active' },
            usage,
            tier: req.user.subscription_tier
        }
    });
}));

// @route   GET /api/subscriptions/plans
// @desc    Get available plans
// @access  Public
router.get('/plans', (req, res) => {
    res.json({
        success: true,
        data: {
            plans: Object.entries(PLANS).map(([key, plan]) => ({
                id: key,
                name: plan.name,
                price: plan.price,
                features: plan.features
            }))
        }
    });
});

// @route   POST /api/subscriptions/checkout
// @desc    Create checkout session for Pro subscription
// @access  Private
router.post('/checkout', authenticate, asyncHandler(async (req, res) => {
    const { plan = 'pro' } = req.body;

    if (req.user.subscription_tier === 'pro') {
        throw new AppError('Already subscribed to Pro', 400, 'ALREADY_SUBSCRIBED');
    }

    const session = await createCheckoutSession(req.user, plan);

    res.json({
        success: true,
        data: {
            sessionId: session.id,
            url: session.url
        }
    });
}));

// @route   POST /api/subscriptions/portal
// @desc    Create billing portal session
// @access  Private
router.post('/portal', authenticate, asyncHandler(async (req, res) => {
    const session = await createBillingPortalSession(req.user);

    res.json({
        success: true,
        data: {
            url: session.url
        }
    });
}));

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription at period end
// @access  Private
router.post('/cancel', authenticate, asyncHandler(async (req, res) => {
    await cancelSubscription(req.user.id);

    res.json({
        success: true,
        message: 'Subscription will be cancelled at end of billing period'
    });
}));

// @route   POST /api/subscriptions/resume
// @desc    Resume cancelled subscription
// @access  Private
router.post('/resume', authenticate, asyncHandler(async (req, res) => {
    await resumeSubscription(req.user.id);

    res.json({
        success: true,
        message: 'Subscription resumed'
    });
}));

// @route   GET /api/subscriptions/invoices
// @desc    Get billing history
// @access  Private
router.get('/invoices', authenticate, asyncHandler(async (req, res) => {
    // In production, this would fetch from Stripe
    // For now, return mock data

    res.json({
        success: true,
        data: {
            invoices: []
        }
    });
}));

export default router;
