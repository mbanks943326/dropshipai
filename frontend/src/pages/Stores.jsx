import { useState, useEffect } from 'react';
import { storesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiShoppingBag, HiPlus, HiRefresh, HiTrash, HiExternalLink, HiCheck } from 'react-icons/hi';

export default function Stores() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        platform: 'shopify',
        storeName: '',
        storeUrl: '',
        apiKey: '',
        accessToken: ''
    });

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const response = await storesAPI.getAll();
            setStores(response.data.data.stores || []);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (e) => {
        e.preventDefault();
        try {
            await storesAPI.connect(formData);
            toast.success('Store connected successfully!');
            setShowModal(false);
            setFormData({ platform: 'shopify', storeName: '', storeUrl: '', apiKey: '', accessToken: '' });
            fetchStores();
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to connect store');
        }
    };

    const handleSync = async (storeId) => {
        try {
            await storesAPI.sync(storeId);
            toast.success('Sync started');
        } catch (error) {
            toast.error('Sync failed');
        }
    };

    const handleDelete = async (storeId) => {
        if (!confirm('Are you sure you want to disconnect this store?')) return;
        try {
            await storesAPI.delete(storeId);
            toast.success('Store disconnected');
            fetchStores();
        } catch (error) {
            toast.error('Failed to disconnect');
        }
    };

    const platformIcons = {
        shopify: '🛍️',
        woocommerce: '🔧',
        ebay: '📦'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiShoppingBag className="w-8 h-8 text-accent-500" />
                        Connected Stores
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your e-commerce store connections
                    </p>
                </div>

                <button onClick={() => setShowModal(true)} className="btn-primary">
                    <HiPlus className="w-5 h-5 mr-2" />
                    Connect Store
                </button>
            </div>

            {/* Stores Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : stores.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stores.map((store) => (
                        <div key={store.id} className="card-hover">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{platformIcons[store.platform]}</span>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            {store.store_name}
                                        </h3>
                                        <p className="text-sm text-slate-500 capitalize">{store.platform}</p>
                                    </div>
                                </div>
                                <span className={`badge ${store.is_active ? 'badge-success' : 'badge-danger'}`}>
                                    {store.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <a
                                    href={store.store_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary-500 hover:underline flex items-center gap-1"
                                >
                                    {store.store_url}
                                    <HiExternalLink className="w-3 h-3" />
                                </a>
                                {store.last_sync_at && (
                                    <p className="text-xs text-slate-500 mt-2">
                                        Last synced: {new Date(store.last_sync_at).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => handleSync(store.id)}
                                    className="btn-secondary btn-sm flex-1"
                                >
                                    <HiRefresh className="w-4 h-4 mr-1" />
                                    Sync
                                </button>
                                <button
                                    onClick={() => handleDelete(store.id)}
                                    className="btn-sm px-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                    <HiTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiShoppingBag className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No stores connected</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                        Connect your Shopify, WooCommerce, or eBay store to start importing and selling products.
                    </p>
                    <button onClick={() => setShowModal(true)} className="btn-primary">
                        <HiPlus className="w-5 h-5 mr-2" />
                        Connect Your First Store
                    </button>
                </div>
            )}

            {/* Connect Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                            Connect a Store
                        </h2>

                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="label">Platform</label>
                                <select
                                    value={formData.platform}
                                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                    className="input"
                                >
                                    <option value="shopify">Shopify</option>
                                    <option value="woocommerce">WooCommerce</option>
                                    <option value="ebay">eBay</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Store Name</label>
                                <input
                                    type="text"
                                    value={formData.storeName}
                                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                                    className="input"
                                    placeholder="My Store"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Store URL</label>
                                <input
                                    type="url"
                                    value={formData.storeUrl}
                                    onChange={(e) => setFormData({ ...formData, storeUrl: e.target.value })}
                                    className="input"
                                    placeholder="https://mystore.myshopify.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">API Key / Access Token</label>
                                <input
                                    type="password"
                                    value={formData.accessToken}
                                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                                    className="input"
                                    placeholder="Enter your API credentials"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Find this in your store's admin settings
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    <HiCheck className="w-5 h-5 mr-2" />
                                    Connect
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
