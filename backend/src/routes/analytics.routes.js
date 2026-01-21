import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError, asyncHandler } from '../middleware/error.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard overview data
// @access  Private
router.get('/dashboard', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get order stats
    const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('total_amount, profit, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

    // Calculate totals
    const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;
    const totalProfit = orders?.reduce((sum, o) => sum + (parseFloat(o.profit) || 0), 0) || 0;
    const totalOrders = orders?.length || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;

    // Get store count
    const { count: storeCount } = await supabaseAdmin
        .from('stores')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    // Get product count
    const { count: productCount } = await supabaseAdmin
        .from('imported_products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

    // Get recent orders
    const { data: recentOrders } = await supabaseAdmin
        .from('orders')
        .select(`
      id, order_number, total_amount, profit, status, created_at,
      store:stores(store_name)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    res.json({
        success: true,
        data: {
            overview: {
                totalRevenue,
                totalProfit,
                totalOrders,
                pendingOrders,
                completedOrders,
                averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
            },
            counts: {
                stores: storeCount,
                products: productCount
            },
            recentOrders
        }
    });
}));

// @route   GET /api/analytics/sales
// @desc    Get sales chart data
// @access  Private
router.get('/sales', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { period = '30d', groupBy = 'day' } = req.query;

    const now = new Date();
    let startDate;
    switch (period) {
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('total_amount, profit, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    // Group by day/week/month
    const salesByDate = {};
    orders?.forEach(order => {
        const date = order.created_at.split('T')[0];
        if (!salesByDate[date]) {
            salesByDate[date] = { revenue: 0, profit: 0, orders: 0 };
        }
        salesByDate[date].revenue += parseFloat(order.total_amount) || 0;
        salesByDate[date].profit += parseFloat(order.profit) || 0;
        salesByDate[date].orders += 1;
    });

    const chartData = Object.entries(salesByDate).map(([date, data]) => ({
        date,
        ...data
    }));

    res.json({
        success: true,
        data: { chartData }
    });
}));

// @route   GET /api/analytics/products
// @desc    Get top performing products
// @access  Private
router.get('/products', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get products with order counts
    const { data: products } = await supabaseAdmin
        .from('imported_products')
        .select(`
      id, custom_title, custom_price, cost_price, profit_margin, status,
      product:products(main_image, ai_score),
      orders:orders(count)
    `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(parseInt(limit));

    res.json({
        success: true,
        data: { products: products || [] }
    });
}));

// @route   GET /api/analytics/roi
// @desc    Get ROI and profitability data
// @access  Private
router.get('/roi', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('total_amount, cost_of_goods, profit, status')
        .eq('user_id', userId)
        .eq('status', 'delivered');

    const totalRevenue = orders?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0;
    const totalCost = orders?.reduce((sum, o) => sum + (parseFloat(o.cost_of_goods) || 0), 0) || 0;
    const totalProfit = orders?.reduce((sum, o) => sum + (parseFloat(o.profit) || 0), 0) || 0;

    const roi = totalCost > 0 ? ((totalProfit / totalCost) * 100) : 0;
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

    res.json({
        success: true,
        data: {
            totalRevenue,
            totalCost,
            totalProfit,
            roi,
            profitMargin
        }
    });
}));

// @route   GET /api/analytics/export
// @desc    Export analytics data
// @access  Private
router.get('/export', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { format = 'csv', type = 'orders' } = req.query;

    let data;
    let filename;

    switch (type) {
        case 'orders':
            const { data: orders } = await supabaseAdmin
                .from('orders')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            data = orders;
            filename = 'orders';
            break;

        case 'products':
            const { data: products } = await supabaseAdmin
                .from('imported_products')
                .select('*, product:products(*)')
                .eq('user_id', userId);
            data = products;
            filename = 'products';
            break;

        default:
            throw new AppError('Invalid export type', 400);
    }

    if (format === 'csv') {
        if (!data || data.length === 0) {
            return res.status(200).send('No data to export');
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
            Object.values(row).map(v =>
                typeof v === 'object' ? JSON.stringify(v) : v
            ).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}-${Date.now()}.csv"`);
        return res.send(csv);
    }

    // JSON format
    res.json({
        success: true,
        data
    });
}));

export default router;
