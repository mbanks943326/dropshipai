import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/stores
// @desc    Get user's connected stores
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { data: stores, error } = await supabaseAdmin
        .from('stores')
        .select('id, platform, store_name, store_url, is_active, last_sync_at, created_at')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    if (error) {
        throw new AppError('Failed to fetch stores', 500);
    }

    res.json({
        success: true,
        data: { stores }
    });
}));

// @route   POST /api/stores/connect
// @desc    Connect a new store
// @access  Private
router.post('/connect', authenticate, [
    body('platform').isIn(['shopify', 'woocommerce', 'ebay']).withMessage('Invalid platform'),
    body('storeName').trim().notEmpty().withMessage('Store name is required'),
    body('storeUrl').isURL().withMessage('Valid store URL is required'),
    body('apiKey').optional().trim(),
    body('apiSecret').optional().trim(),
    body('accessToken').optional().trim()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { platform, storeName, storeUrl, apiKey, apiSecret, accessToken } = req.body;

    // Check store limit for free tier
    if (req.user.subscription_tier === 'free') {
        const { count } = await supabaseAdmin
            .from('stores')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', req.user.id);

        if (count >= 1) {
            throw new AppError('Free tier limited to 1 store. Upgrade to Pro for unlimited stores.', 403, 'LIMIT_REACHED');
        }
    }

    // Check for duplicate store
    const { data: existing } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('store_url', storeUrl)
        .single();

    if (existing) {
        throw new AppError('Store already connected', 400, 'DUPLICATE_STORE');
    }

    // Create store connection
    const { data: store, error } = await supabaseAdmin
        .from('stores')
        .insert({
            user_id: req.user.id,
            platform,
            store_name: storeName,
            store_url: storeUrl,
            api_key: apiKey,
            api_secret: apiSecret,
            access_token: accessToken
        })
        .select('id, platform, store_name, store_url, is_active, created_at')
        .single();

    if (error) {
        throw new AppError('Failed to connect store', 500);
    }

    res.status(201).json({
        success: true,
        data: { store },
        message: 'Store connected successfully'
    });
}));

// @route   GET /api/stores/:id
// @desc    Get single store details
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { data: store, error } = await supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (error || !store) {
        throw new AppError('Store not found', 404);
    }

    // Get product count for this store
    const { count: productCount } = await supabaseAdmin
        .from('imported_products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id);

    // Get order count
    const { count: orderCount } = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id);

    res.json({
        success: true,
        data: {
            store: {
                ...store,
                // Hide sensitive data
                api_key: store.api_key ? '***' : null,
                api_secret: store.api_secret ? '***' : null,
                access_token: store.access_token ? '***' : null
            },
            stats: {
                productCount,
                orderCount
            }
        }
    });
}));

// @route   PUT /api/stores/:id
// @desc    Update store settings
// @access  Private
router.put('/:id', authenticate, [
    body('storeName').optional().trim().notEmpty(),
    body('apiKey').optional().trim(),
    body('apiSecret').optional().trim(),
    body('accessToken').optional().trim(),
    body('isActive').optional().isBoolean(),
    body('settings').optional().isObject()
], asyncHandler(async (req, res) => {
    const { storeName, apiKey, apiSecret, accessToken, isActive, settings } = req.body;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (!existing) {
        throw new AppError('Store not found', 404);
    }

    const updates = {};
    if (storeName) updates.store_name = storeName;
    if (apiKey) updates.api_key = apiKey;
    if (apiSecret) updates.api_secret = apiSecret;
    if (accessToken) updates.access_token = accessToken;
    if (isActive !== undefined) updates.is_active = isActive;
    if (settings) updates.settings = settings;

    const { data: store, error } = await supabaseAdmin
        .from('stores')
        .update(updates)
        .eq('id', req.params.id)
        .select('id, platform, store_name, store_url, is_active, settings, created_at')
        .single();

    if (error) {
        throw new AppError('Failed to update store', 500);
    }

    res.json({
        success: true,
        data: { store }
    });
}));

// @route   DELETE /api/stores/:id
// @desc    Disconnect store
// @access  Private
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { error } = await supabaseAdmin
        .from('stores')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.user.id);

    if (error) {
        throw new AppError('Failed to disconnect store', 500);
    }

    res.json({
        success: true,
        message: 'Store disconnected successfully'
    });
}));

// @route   POST /api/stores/:id/sync
// @desc    Sync products with store
// @access  Private
router.post('/:id/sync', authenticate, asyncHandler(async (req, res) => {
    const { data: store } = await supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (!store) {
        throw new AppError('Store not found', 404);
    }

    // In a real implementation, this would call the store's API
    // to sync products and inventory

    // Update last sync timestamp
    await supabaseAdmin
        .from('stores')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', req.params.id);

    res.json({
        success: true,
        message: 'Store sync initiated',
        data: {
            syncedAt: new Date().toISOString()
        }
    });
}));

// @route   GET /api/stores/:id/oauth/:platform
// @desc    Initiate OAuth flow for store connection
// @access  Private
router.get('/:platform/oauth', authenticate, asyncHandler(async (req, res) => {
    const { platform } = req.params;
    const { shop } = req.query; // For Shopify

    // Generate OAuth URL based on platform
    let oauthUrl;

    switch (platform) {
        case 'shopify':
            if (!shop) {
                throw new AppError('Shop domain is required', 400);
            }
            // In production, this would redirect to Shopify OAuth
            oauthUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID}&scope=read_products,write_products,read_orders,write_orders&redirect_uri=${process.env.FRONTEND_URL}/stores/shopify/callback`;
            break;

        case 'ebay':
            oauthUrl = `https://auth.ebay.com/oauth2/authorize?client_id=${process.env.EBAY_CLIENT_ID}&response_type=code&redirect_uri=${process.env.FRONTEND_URL}/stores/ebay/callback&scope=https://api.ebay.com/oauth/api_scope`;
            break;

        default:
            throw new AppError('OAuth not supported for this platform', 400);
    }

    res.json({
        success: true,
        data: { oauthUrl }
    });
}));

export default router;
