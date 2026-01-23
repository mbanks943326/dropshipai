import express from 'express';
import { query, body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, requireSubscription, optionalAuth } from '../middleware/auth.middleware.js';
import { searchAmazon } from '../services/amazon.service.js';
import { searchAliExpress } from '../services/aliexpress.service.js';
import { searchTemu } from '../services/temu.service.js';
import { searchEbay } from '../services/ebay.service.js';
import { analyzeProduct, getWinningProducts } from '../services/gemini.service.js';
import { trackUsage, checkUsageLimit } from '../services/usage.service.js';
import NodeCache from 'node-cache';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// @route   GET /api/products/search
// @desc    Search products from all sources
// @access  Private (with usage limits)
router.get('/search', authenticate, [
    query('q').notEmpty().withMessage('Search query is required'),
    query('source').optional().isIn(['amazon', 'aliexpress', 'temu', 'ebay', 'all']),
    query('minPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    query('maxPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    query('minRating').optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }),
    query('category').optional({ checkFalsy: true }).trim(),
    query('page').optional({ checkFalsy: true }).isInt({ min: 1 }),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 50 })
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
        q: searchQuery,
        source = 'all',
        minPrice,
        maxPrice,
        minRating,
        category,
        page = 1,
        limit = 20
    } = req.query;

    // Check usage limits for free tier
    const usageAllowed = await checkUsageLimit(req.user.id, 'search', req.user.subscription_tier);
    if (!usageAllowed) {
        throw new AppError('Daily search limit reached. Upgrade to Pro for unlimited searches.', 429, 'LIMIT_REACHED');
    }

    // Check cache
    const cacheKey = `search:${searchQuery}:${source}:${minPrice}:${maxPrice}:${minRating}:${category}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json({ success: true, data: cached, cached: true });
    }

    const filters = { minPrice, maxPrice, minRating, category, page, limit };
    let products = [];

    try {
        if (source === 'all' || source === 'amazon') {
            const amazonProducts = await searchAmazon(searchQuery, filters);
            products = products.concat(amazonProducts);
        }

        if (source === 'all' || source === 'aliexpress') {
            const aliProducts = await searchAliExpress(searchQuery, filters);
            products = products.concat(aliProducts);
        }

        if (source === 'all' || source === 'temu') {
            const temuProducts = await searchTemu(searchQuery, filters);
            products = products.concat(temuProducts);
        }

        if (source === 'all' || source === 'ebay') {
            const ebayProducts = await searchEbay(searchQuery, filters);
            products = products.concat(ebayProducts);
        }
    } catch (error) {
        console.error('Product search error:', error);
        // Continue with partial results
    }

    // Cache products in database
    for (const product of products) {
        await supabaseAdmin
            .from('products')
            .upsert({
                source: product.source,
                external_id: product.externalId,
                title: product.title,
                description: product.description,
                price: product.price,
                original_price: product.originalPrice,
                currency: product.currency,
                images: product.images,
                main_image: product.mainImage,
                rating: product.rating,
                reviews_count: product.reviewsCount,
                sales_count: product.salesCount,
                category: product.category,
                supplier_url: product.supplierUrl,
                cached_at: new Date().toISOString()
            }, {
                onConflict: 'source,external_id'
            });
    }

    // Track usage
    await trackUsage(req.user.id, 'search');

    // Cache results
    const result = {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: products.length,
            hasMore: products.length === parseInt(limit)
        }
    };
    cache.set(cacheKey, result);

    res.json({
        success: true,
        data: result
    });
}));

// @route   GET /api/products/winning
// @desc    Get AI-suggested winning products
// @access  Private
router.get('/winning', authenticate, asyncHandler(async (req, res) => {
    const { category, limit = 20 } = req.query;

    // Check if user can access AI features
    if (req.user.subscription_tier === 'free') {
        // Free tier: show cached winning products only
        const { data: products } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('is_winning', true)
            .order('ai_score', { ascending: false })
            .limit(10);

        return res.json({
            success: true,
            data: {
                products: products || [],
                isLimited: true,
                message: 'Upgrade to Pro for personalized AI recommendations'
            }
        });
    }

    // Pro tier: get fresh AI recommendations
    const winningProducts = await getWinningProducts(category, parseInt(limit));

    res.json({
        success: true,
        data: {
            products: winningProducts,
            isLimited: false
        }
    });
}));

// @route   GET /api/products/:id
// @desc    Get single product details
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    res.json({
        success: true,
        data: { product }
    });
}));

// @route   POST /api/products/:id/analyze
// @desc    Get AI analysis for a product
// @access  Private (Pro only)
router.post('/:id/analyze', authenticate, requireSubscription('pro'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !product) {
        throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Get AI analysis
    const analysis = await analyzeProduct(product);

    // Update product with AI analysis
    await supabaseAdmin
        .from('products')
        .update({
            ai_score: analysis.score,
            ai_analysis: analysis,
            is_winning: analysis.score >= 70
        })
        .eq('id', id);

    res.json({
        success: true,
        data: {
            product: { ...product, ai_score: analysis.score, ai_analysis: analysis },
            analysis
        }
    });
}));

// @route   POST /api/products/import
// @desc    Import product to user's store
// @access  Private
router.post('/import', authenticate, [
    body('productData').notEmpty().withMessage('Product data is required'),
    body('storeId').notEmpty().withMessage('Store ID is required'),
    body('customTitle').optional().trim(),
    body('customDescription').optional().trim(),
    body('customPrice').optional().isFloat({ min: 0 }),
    body('markupPercentage').optional().isFloat({ min: 0, max: 500 })
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
        productData,
        storeId,
        customTitle,
        customDescription,
        customPrice,
        markupPercentage = 30
    } = req.body;

    // Check usage limits
    const usageAllowed = await checkUsageLimit(req.user.id, 'import', req.user.subscription_tier);
    if (!usageAllowed) {
        throw new AppError('Daily import limit reached. Upgrade to Pro for unlimited imports.', 429, 'LIMIT_REACHED');
    }

    // Verify store belongs to user
    const { data: store } = await supabaseAdmin
        .from('stores')
        .select('id, platform, store_url, api_key, access_token')
        .eq('id', storeId)
        .eq('user_id', req.user.id)
        .single();

    if (!store) {
        throw new AppError('Store not found', 404, 'STORE_NOT_FOUND');
    }

    // Extract product info from productData
    const product = {
        title: productData.title,
        description: productData.description || '',
        price: productData.price || 0,
        mainImage: productData.mainImage || productData.image,
        images: productData.images || [productData.mainImage],
        source: productData.source,
        externalId: productData.externalId,
        supplierUrl: productData.supplierUrl,
        rating: productData.rating,
        reviewsCount: productData.reviewsCount,
        salesCount: productData.salesCount
    };

    // Calculate prices
    const costPrice = product.price;
    const sellingPrice = customPrice || (costPrice * (1 + markupPercentage / 100));
    const profitMargin = sellingPrice - costPrice;

    // Create imported product record
    const { data: importedProduct, error } = await supabaseAdmin
        .from('imported_products')
        .insert({
            user_id: req.user.id,
            store_id: storeId,
            source: product.source,
            external_id: product.externalId,
            custom_title: customTitle || product.title,
            custom_description: customDescription || product.description,
            original_title: product.title,
            main_image: product.mainImage,
            images: product.images,
            supplier_url: product.supplierUrl,
            custom_price: sellingPrice,
            cost_price: costPrice,
            markup_percentage: markupPercentage,
            profit_margin: profitMargin,
            rating: product.rating,
            reviews_count: product.reviewsCount,
            sales_count: product.salesCount,
            status: 'draft'
        })
        .select()
        .single();

    if (error) {
        console.error('Import error:', error);
        throw new AppError('Failed to import product: ' + error.message, 500);
    }

    // Track usage
    await trackUsage(req.user.id, 'import');

    res.status(201).json({
        success: true,
        data: {
            importedProduct,
            message: 'Product imported as draft. Publish to sync with store.'
        }
    });
}));

// @route   GET /api/products/imported
// @desc    Get user's imported products
// @access  Private
router.get('/imported/list', authenticate, asyncHandler(async (req, res) => {
    const { storeId, status, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
        .from('imported_products')
        .select(`
      *,
      store:stores(id, store_name, platform)
    `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    if (storeId) {
        query = query.eq('store_id', storeId);
    }

    if (status) {
        query = query.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) {
        throw new AppError('Failed to fetch imported products', 500);
    }

    res.json({
        success: true,
        data: {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count
            }
        }
    });
}));

// @route   DELETE /api/products/imported/:id
// @desc    Delete imported product
// @access  Private
router.delete('/imported/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify product belongs to user
    const { data: product } = await supabaseAdmin
        .from('imported_products')
        .select('id')
        .eq('id', id)
        .eq('user_id', req.user.id)
        .single();

    if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Delete product
    const { error } = await supabaseAdmin
        .from('imported_products')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete product', 500);
    }

    res.json({
        success: true,
        message: 'Product deleted successfully'
    });
}));

export default router;
