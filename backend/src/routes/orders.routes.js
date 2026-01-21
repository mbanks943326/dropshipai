import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, requireSubscription } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', authenticate, [
    query('storeId').optional().isUUID(),
    query('status').optional().isIn(['pending', 'processing', 'awaiting_shipment', 'shipped', 'delivered', 'cancelled', 'refunded']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], asyncHandler(async (req, res) => {
    const { storeId, status, page = 1, limit = 20 } = req.query;

    let queryBuilder = supabaseAdmin
        .from('orders')
        .select(`
      *,
      store:stores(id, store_name, platform),
      imported_product:imported_products(id, custom_title, product:products(title, main_image))
    `, { count: 'exact' })
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    if (storeId) {
        queryBuilder = queryBuilder.eq('store_id', storeId);
    }

    if (status) {
        queryBuilder = queryBuilder.eq('status', status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryBuilder = queryBuilder.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await queryBuilder;

    if (error) {
        throw new AppError('Failed to fetch orders', 500);
    }

    res.json({
        success: true,
        data: {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
}));

// @route   GET /api/orders/:id
// @desc    Get single order details
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
      *,
      store:stores(id, store_name, platform, store_url),
      imported_product:imported_products(
        id, custom_title, custom_description, custom_price, cost_price,
        product:products(*)
      )
    `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (error || !order) {
        throw new AppError('Order not found', 404);
    }

    res.json({
        success: true,
        data: { order }
    });
}));

// @route   POST /api/orders/:id/fulfill
// @desc    Fulfill an order (place with supplier)
// @access  Private
router.post('/:id/fulfill', authenticate, asyncHandler(async (req, res) => {
    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
      *,
      imported_product:imported_products(
        product:products(supplier_url, source)
      )
    `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (error || !order) {
        throw new AppError('Order not found', 404);
    }

    if (order.status !== 'pending' && order.status !== 'processing') {
        throw new AppError('Order cannot be fulfilled', 400);
    }

    // In a real implementation, this would:
    // 1. Place order on supplier website (Amazon, AliExpress, Temu)
    // 2. Store the supplier order ID
    // 3. Set up tracking webhook

    // Update order status
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
            status: 'processing',
            fulfillment_status: 'processing',
            supplier_order_status: 'pending'
        })
        .eq('id', req.params.id)
        .select()
        .single();

    if (updateError) {
        throw new AppError('Failed to update order', 500);
    }

    // Create notification
    await supabaseAdmin
        .from('notifications')
        .insert({
            user_id: req.user.id,
            type: 'order',
            title: 'Order Fulfillment Started',
            message: `Order #${order.order_number} is being processed with the supplier.`,
            data: { orderId: order.id }
        });

    res.json({
        success: true,
        data: { order: updatedOrder },
        message: 'Order fulfillment initiated'
    });
}));

// @route   POST /api/orders/:id/auto-fulfill
// @desc    Auto-fulfill order (Pro only)
// @access  Private (Pro)
router.post('/:id/auto-fulfill', authenticate, requireSubscription('pro'), asyncHandler(async (req, res) => {
    const { data: order } = await supabaseAdmin
        .from('orders')
        .select(`
      *,
      imported_product:imported_products(
        auto_fulfill,
        product:products(supplier_url, source)
      )
    `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    // Auto-fulfillment logic would go here
    // This would automatically place orders with suppliers

    await supabaseAdmin
        .from('orders')
        .update({
            status: 'awaiting_shipment',
            fulfillment_status: 'fulfilled',
            supplier_order_id: `AUTO-${Date.now()}`
        })
        .eq('id', req.params.id);

    res.json({
        success: true,
        message: 'Auto-fulfillment completed'
    });
}));

// @route   PUT /api/orders/:id/tracking
// @desc    Update order tracking info
// @access  Private
router.put('/:id/tracking', authenticate, [
    body('trackingNumber').trim().notEmpty().withMessage('Tracking number is required'),
    body('trackingCarrier').optional().trim(),
    body('trackingUrl').optional().isURL()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { trackingNumber, trackingCarrier, trackingUrl } = req.body;

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update({
            tracking_number: trackingNumber,
            tracking_carrier: trackingCarrier,
            tracking_url: trackingUrl,
            status: 'shipped',
            shipped_at: new Date().toISOString()
        })
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to update tracking', 500);
    }

    // Send notification to customer (in production)
    // await sendTrackingEmail(order);

    res.json({
        success: true,
        data: { order }
    });
}));

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', authenticate, [
    body('status').isIn(['pending', 'processing', 'awaiting_shipment', 'shipped', 'delivered', 'cancelled', 'refunded'])
], asyncHandler(async (req, res) => {
    const { status } = req.body;

    const updates = { status };

    if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
    }

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update(updates)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to update order status', 500);
    }

    res.json({
        success: true,
        data: { order }
    });
}));

// @route   GET /api/orders/:id/track
// @desc    Get tracking information
// @access  Private
router.get('/:id/track', authenticate, asyncHandler(async (req, res) => {
    const { data: order } = await supabaseAdmin
        .from('orders')
        .select('id, tracking_number, tracking_carrier, tracking_url, status, shipped_at, delivered_at')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    // In production, this would fetch real-time tracking from carrier APIs
    const trackingInfo = {
        trackingNumber: order.tracking_number,
        carrier: order.tracking_carrier,
        trackingUrl: order.tracking_url,
        status: order.status,
        events: [
            // Mock tracking events
            {
                date: order.shipped_at,
                status: 'shipped',
                location: 'Origin',
                description: 'Package shipped'
            }
        ]
    };

    if (order.delivered_at) {
        trackingInfo.events.push({
            date: order.delivered_at,
            status: 'delivered',
            location: 'Destination',
            description: 'Package delivered'
        });
    }

    res.json({
        success: true,
        data: { tracking: trackingInfo }
    });
}));

export default router;
