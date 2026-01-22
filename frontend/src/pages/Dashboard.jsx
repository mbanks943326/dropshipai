import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { analyticsAPI } from '../services/api';
import { HiTrendingUp, HiCurrencyDollar, HiShoppingCart, HiClock, HiArrowUp, HiArrowDown, HiExternalLink } from 'react-icons/hi';

export default function Dashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        fetchDashboardData();
    }, [period]);

    const fetchDashboardData = async () => {
        try {
            const response = await analyticsAPI.getDashboard(period);
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate real percentage changes (show 0% or N/A when no data)
    const calculateChange = (current, previous) => {
        if (!current || current === 0) return { change: '0%', type: 'neutral' };
        if (!previous || previous === 0) return { change: 'N/A', type: 'neutral' };
        const changeVal = ((current - previous) / previous) * 100;
        return {
            change: `${changeVal >= 0 ? '+' : ''}${changeVal.toFixed(1)}%`,
            type: changeVal >= 0 ? 'positive' : 'negative'
        };
    };

    const stats = [
        {
            name: 'Total Revenue',
            value: data?.overview?.totalRevenue || 0,
            format: 'currency',
            icon: HiCurrencyDollar,
            color: 'from-green-500 to-emerald-500',
            ...calculateChange(data?.overview?.totalRevenue, data?.overview?.previousRevenue)
        },
        {
            name: 'Total Profit',
            value: data?.overview?.totalProfit || 0,
            format: 'currency',
            icon: HiTrendingUp,
            color: 'from-blue-500 to-cyan-500',
            ...calculateChange(data?.overview?.totalProfit, data?.overview?.previousProfit)
        },
        {
            name: 'Total Orders',
            value: data?.overview?.totalOrders || 0,
            format: 'number',
            icon: HiShoppingCart,
            color: 'from-purple-500 to-pink-500',
            ...calculateChange(data?.overview?.totalOrders, data?.overview?.previousOrders)
        },
        {
            name: 'Pending Orders',
            value: data?.overview?.pendingOrders || 0,
            format: 'number',
            icon: HiClock,
            color: 'from-orange-500 to-amber-500',
            ...calculateChange(data?.overview?.pendingOrders, data?.overview?.previousPending)
        }
    ];

    const formatValue = (value, format) => {
        if (format === 'currency') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        }
        return new Intl.NumberFormat('en-US').format(value);
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Here's what's happening with your business today.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {['7d', '30d', '90d'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="card group hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.name}</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                    {formatValue(stat.value, stat.format)}
                                </p>
                            </div>
                            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center mt-4">
                            {stat.type === 'positive' ? (
                                <HiArrowUp className="w-4 h-4 text-green-500" />
                            ) : stat.type === 'negative' ? (
                                <HiArrowDown className="w-4 h-4 text-red-500" />
                            ) : (
                                <span className="w-4 h-4" />
                            )}
                            <span className={`text-sm font-medium ${stat.type === 'positive' ? 'text-green-500' :
                                stat.type === 'negative' ? 'text-red-500' :
                                    'text-slate-400'
                                }`}>
                                {stat.change}
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">vs last period</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Link to="/products/search" className="card-hover flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-500">Search Products</h3>
                        <p className="text-sm text-slate-500">Find winning products from multiple sources</p>
                    </div>
                    <HiExternalLink className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
                </Link>

                <Link to="/products/winning" className="card-hover flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-500">AI Winning Products</h3>
                        <p className="text-sm text-slate-500">Get AI-curated product recommendations</p>
                    </div>
                    <HiExternalLink className="w-5 h-5 text-slate-400 group-hover:text-amber-500" />
                </Link>

                <Link to="/stores" className="card-hover flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-pink-500 rounded-xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-accent-500">Connect Store</h3>
                        <p className="text-sm text-slate-500">Link Shopify, WooCommerce or eBay</p>
                    </div>
                    <HiExternalLink className="w-5 h-5 text-slate-400 group-hover:text-accent-500" />
                </Link>
            </div>

            {/* Recent Orders */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="section-title">Recent Orders</h2>
                    <Link to="/orders" className="text-sm text-primary-500 hover:text-primary-600">
                        View all →
                    </Link>
                </div>

                {data?.recentOrders?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                    <th className="pb-3 font-medium">Order</th>
                                    <th className="pb-3 font-medium">Store</th>
                                    <th className="pb-3 font-medium">Amount</th>
                                    <th className="pb-3 font-medium">Profit</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {data.recentOrders.map((order) => (
                                    <tr key={order.id} className="text-sm">
                                        <td className="py-3 font-medium text-slate-900 dark:text-white">
                                            #{order.order_number || order.id.slice(0, 8)}
                                        </td>
                                        <td className="py-3 text-slate-600 dark:text-slate-400">
                                            {order.store?.store_name || 'N/A'}
                                        </td>
                                        <td className="py-3 text-slate-900 dark:text-white">
                                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 text-green-500 font-medium">
                                            +${parseFloat(order.profit || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3">
                                            <span className={`badge ${order.status === 'delivered' ? 'badge-success' :
                                                order.status === 'shipped' ? 'badge-info' :
                                                    order.status === 'pending' ? 'badge-warning' :
                                                        'badge-danger'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No orders yet. Start by importing products to your store!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
