import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, requireSubscription } from '../middleware/auth.middleware.js';
import {
    analyzeProduct,
    generateProductDescription,
    getPricingSuggestion,
    getMarketingSuggestions
} from '../services/gemini.service.js';
import { trackUsage, checkUsageLimit } from '../services/usage.service.js';

const router = express.Router();

// @route   POST /api/ai/analyze
// @desc    Analyze a product with AI
// @access  Private (with limits)
router.post('/analyze', authenticate, [
    body('productId').notEmpty().withMessage('Product ID is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check usage limits
    const usageAllowed = await checkUsageLimit(req.user.id, 'ai_analysis', req.user.subscription_tier);
    if (!usageAllowed) {
        throw new AppError('Daily AI analysis limit reached. Upgrade to Pro for unlimited analyses.', 429, 'LIMIT_REACHED');
    }

    const { productId } = req.body;

    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const analysis = await analyzeProduct(product);

    // Update product with analysis
    await supabaseAdmin
        .from('products')
        .update({
            ai_score: analysis.score,
            ai_analysis: analysis,
            is_winning: analysis.score >= 70
        })
        .eq('id', productId);

    // Track usage
    await trackUsage(req.user.id, 'ai_analysis');

    res.json({
        success: true,
        data: { analysis }
    });
}));

// @route   POST /api/ai/description
// @desc    Generate product description with AI
// @access  Private (Pro only)
router.post('/description', authenticate, requireSubscription('pro'), [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('style').optional().isIn(['professional', 'casual', 'luxury', 'minimal'])
], asyncHandler(async (req, res) => {
    const { productId, style = 'professional' } = req.body;

    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const description = await generateProductDescription(product, style);

    res.json({
        success: true,
        data: { description }
    });
}));

// @route   POST /api/ai/pricing
// @desc    Get AI pricing suggestions
// @access  Private (Pro only)
router.post('/pricing', authenticate, requireSubscription('pro'), [
    body('productId').notEmpty().withMessage('Product ID is required')
], asyncHandler(async (req, res) => {
    const { productId } = req.body;

    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const pricing = await getPricingSuggestion(product);

    res.json({
        success: true,
        data: { pricing }
    });
}));

// @route   POST /api/ai/marketing
// @desc    Get AI marketing suggestions
// @access  Private (Pro only)
router.post('/marketing', authenticate, requireSubscription('pro'), [
    body('productId').notEmpty().withMessage('Product ID is required')
], asyncHandler(async (req, res) => {
    const { productId } = req.body;

    const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    const marketing = await getMarketingSuggestions(product);

    res.json({
        success: true,
        data: { marketing }
    });
}));

// @route   GET /api/ai/suggestions
// @desc    Get AI suggestions for the user
// @access  Private
router.get('/suggestions', authenticate, asyncHandler(async (req, res) => {
    const { type = 'all', limit = 5 } = req.query;

    const { data: suggestions } = await supabaseAdmin
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: { suggestions: suggestions || [] }
    });
}));

export default router;
