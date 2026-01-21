import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiClipboardList, HiTruck, HiCheck, HiX, HiClock, HiEye } from 'react-icons/hi';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchOrders();
    }, [filter, page]);

    const fetchOrders = async () => {
        try {
            const params = { page, limit: 20 };
            if (filter !== 'all') params.status = filter;
            const response = await ordersAPI.getAll(params);
            setOrders(response.data.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFulfill = async (orderId) => {
        try {
            await ordersAPI.fulfill(orderId);
            toast.success('Order fulfillment started');
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Fulfillment failed');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'delivered': return <HiCheck className="w-4 h-4 text-green-500" />;
            case 'shipped': return <HiTruck className="w-4 h-4 text-blue-500" />;
            case 'pending': return <HiClock className="w-4 h-4 text-yellow-500" />;
            case 'cancelled': return <HiX className="w-4 h-4 text-red-500" />;
            default: return <HiClock className="w-4 h-4 text-slate-500" />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'delivered': return 'badge-success';
            case 'shipped': return 'badge-info';
            case 'pending': return 'badge-warning';
            case 'processing': return 'badge-info';
            case 'cancelled': case 'refunded': return 'badge-danger';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const statuses = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiClipboardList className="w-8 h-8 text-blue-500" />
                        Orders
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage and fulfill your customer orders
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                ))}
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="card">
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>
            ) : orders.length > 0 ? (
                <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr className="text-left text-sm text-slate-500 dark:text-slate-400">
                                    <th className="px-6 py-4 font-medium">Order</th>
                                    <th className="px-6 py-4 font-medium">Customer</th>
                                    <th className="px-6 py-4 font-medium">Store</th>
                                    <th className="px-6 py-4 font-medium">Amount</th>
                                    <th className="px-6 py-4 font-medium">Profit</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {orders.map((order) => (
                                    <tr key={order.id} className="text-sm hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                #{order.order_number || order.id.slice(0, 8)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-slate-900 dark:text-white">{order.customer_name || 'N/A'}</p>
                                                <p className="text-xs text-slate-500">{order.customer_email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {order.store?.store_name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                            ${parseFloat(order.total_amount || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-green-500">
                                            +${parseFloat(order.profit || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${getStatusBadge(order.status)} inline-flex items-center gap-1`}>
                                                {getStatusIcon(order.status)}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-1">
                                                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                                    <HiEye className="w-4 h-4 text-slate-500" />
                                                </button>
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleFulfill(order.id)}
                                                        className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/20 text-green-500"
                                                    >
                                                        <HiTruck className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiClipboardList className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No orders yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Orders will appear here when customers purchase products from your stores.
                    </p>
                </div>
            )}
        </div>
    );
}
