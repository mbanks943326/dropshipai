import { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiCollection, HiPencil, HiTrash, HiEye, HiRefresh } from 'react-icons/hi';
import ProductViewModal from '../components/ProductViewModal';
import ProductEditModal from '../components/ProductEditModal';

export default function ImportedProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [viewModal, setViewModal] = useState(null);
    const [editModal, setEditModal] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, [filter]);

    const fetchProducts = async () => {
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const response = await productsAPI.getImported(params);
            setProducts(response.data.data.products || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (product) => {
        setViewModal(product);
    };

    const handleEdit = (product) => {
        setEditModal(product);
    };

    const handleSync = async (product) => {
        try {
            toast.loading('Publishing product to store...');
            // TODO: Implement sync logic with store
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulated delay
            toast.dismiss();
            toast.success('Product published successfully!');
            fetchProducts();
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to publish product');
        }
    };

    const handleDelete = async (productId) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            toast.loading('Deleting product...');
            await productsAPI.deleteImported(productId);
            toast.dismiss();
            toast.success('Product deleted successfully!');
            fetchProducts();
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to delete product');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active': return 'badge-success';
            case 'draft': return 'badge-warning';
            case 'paused': return 'badge-info';
            default: return 'badge-danger';
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-72 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <HiCollection className="w-8 h-8 text-primary-500" />
                        My Products
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your imported products
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {['all', 'active', 'draft', 'paused'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-primary-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((item) => (
                        <div key={item.id} className="card-hover group">
                            <div className="flex items-start gap-4">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                                    <img
                                        src={item.main_image || 'https://via.placeholder.com/80'}
                                        alt={item.custom_title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                                        {item.custom_title || item.original_title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {item.store?.store_name} • {item.store?.platform}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-slate-500">Cost</p>
                                        <p className="font-semibold text-slate-900 dark:text-white">
                                            ${parseFloat(item.cost_price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Price</p>
                                        <p className="font-semibold text-slate-900 dark:text-white">
                                            ${parseFloat(item.custom_price || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Profit</p>
                                        <p className="font-semibold text-green-500">
                                            ${parseFloat(item.profit_margin || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <span className={`badge ${getStatusBadge(item.status)}`}>
                                    {item.status}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleView(item)}
                                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="View product"
                                    >
                                        <HiEye className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="Edit product"
                                    >
                                        <HiPencil className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => handleSync(item)}
                                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                        title="Publish to store"
                                    >
                                        <HiRefresh className="w-4 h-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20"
                                        title="Delete product"
                                    >
                                        <HiTrash className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiCollection className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No imported products</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Start by searching for products and importing them to your store.
                    </p>
                </div>
            )}

            {/* Modals */}
            {viewModal && (
                <ProductViewModal
                    product={viewModal}
                    onClose={() => setViewModal(null)}
                />
            )}
            {editModal && (
                <ProductEditModal
                    product={editModal}
                    onClose={() => setEditModal(null)}
                    onSave={fetchProducts}
                />
            )}
        </div>
    );
}
