import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { HiChartBar, HiTrendingUp, HiCurrencyDollar, HiDownload } from 'react-icons/hi';

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            const [dashboard, roi] = await Promise.all([
                analyticsAPI.getDashboard(period),
                analyticsAPI.getROI()
            ]);
            setData({
                ...dashboard.data.data,
                roi: roi.data.data
            });
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type) => {
        try {
            const response = await analyticsAPI.export(type, 'csv');
            const blob = new Blob([response.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-export-${Date.now()}.csv`;
            a.click();
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                    ))}
                </div>
                <div className="h-80 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiChartBar className="w-8 h-8 text-purple-500" />
                        Analytics
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Track your business performance
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {['7d', '30d', '90d'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <button className="btn-secondary">
                            <HiDownload className="w-5 h-5 mr-2" />
                            Export
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-40 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                                onClick={() => handleExport('orders')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Export Orders
                            </button>
                            <button
                                onClick={() => handleExport('products')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                                Export Products
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                            <HiCurrencyDollar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                ${parseFloat(data?.roi?.totalRevenue || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                            <HiTrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Profit</p>
                            <p className="text-2xl font-bold text-green-500">
                                ${parseFloat(data?.roi?.totalProfit || 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                            <HiChartBar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">ROI</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {parseFloat(data?.roi?.roi || 0).toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="card">
                <h3 className="section-title mb-6">Performance Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                            {data?.overview?.totalOrders || 0}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Total Orders</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-3xl font-bold text-green-500">
                            {data?.overview?.completedOrders || 0}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Completed</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-3xl font-bold text-yellow-500">
                            {data?.overview?.pendingOrders || 0}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                            ${parseFloat(data?.overview?.averageOrderValue || 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">Avg. Order Value</p>
                    </div>
                </div>
            </div>

            {/* Profit Margin */}
            <div className="card">
                <h3 className="section-title mb-6">Profit Margin Analysis</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-600 dark:text-slate-400">Profit Margin</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                                {parseFloat(data?.roi?.profitMargin || 0).toFixed(1)}%
                            </span>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(data?.roi?.profitMargin || 0, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                            <p className="text-sm text-slate-500">Revenue</p>
                            <p className="text-lg font-semibold text-slate-900 dark:text-white">
                                ${parseFloat(data?.roi?.totalRevenue || 0).toFixed(0)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-500">Costs</p>
                            <p className="text-lg font-semibold text-red-500">
                                ${parseFloat(data?.roi?.totalCost || 0).toFixed(0)}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-slate-500">Net Profit</p>
                            <p className="text-lg font-semibold text-green-500">
                                ${parseFloat(data?.roi?.totalProfit || 0).toFixed(0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
