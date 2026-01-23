import { HiX, HiExternalLink } from 'react-icons/hi';

export default function ProductViewModal({ product, onClose }) {
    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Product Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <HiX className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Image Gallery */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-xl overflow-hidden">
                                <img
                                    src={product.main_image || 'https://via.placeholder.com/400'}
                                    alt={product.custom_title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {product.images && product.images.length > 1 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {product.images.slice(1, 5).map((img, idx) => (
                                        <div key={idx} className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                                            <img src={img} alt={`Product ${idx + 2}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                    {product.custom_title || product.original_title}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className={`badge ${product.status === 'active' ? 'badge-success' : product.status === 'draft' ? 'badge-warning' : 'badge-info'}`}>
                                        {product.status}
                                    </span>
                                    <span>•</span>
                                    <span>{product.source}</span>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Cost Price</span>
                                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                                        ${parseFloat(product.cost_price || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Selling Price</span>
                                    <span className="text-lg font-semibold text-primary-500">
                                        ${parseFloat(product.custom_price || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-500">Markup</span>
                                    <span className="text-lg font-semibold text-blue-500">
                                        {parseFloat(product.markup_percentage || 0).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="pt-3 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profit Margin</span>
                                    <span className="text-xl font-bold text-green-500">
                                        ${parseFloat(product.profit_margin || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Stats */}
                            {(product.rating || product.reviews_count || product.sales_count) && (
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    {product.rating && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500">Rating</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                ⭐ {parseFloat(product.rating).toFixed(1)}
                                            </p>
                                        </div>
                                    )}
                                    {product.reviews_count > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500">Reviews</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                {product.reviews_count.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {product.sales_count > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                                            <p className="text-xs text-slate-500">Sales</p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                {product.sales_count.toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Store Info */}
                            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4">
                                <p className="text-xs text-slate-500 mb-1">Connected Store</p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                    {product.store?.store_name}
                                </p>
                                <p className="text-sm text-slate-500 capitalize">
                                    {product.store?.platform}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {(product.custom_description || product.original_title) && (
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Description</h4>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                {product.custom_description || `Product: ${product.original_title}`}
                            </p>
                        </div>
                    )}

                    {/* Supplier Link */}
                    {product.supplier_url && (
                        <div>
                            <a
                                href={product.supplier_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium"
                            >
                                View on {product.source}
                                <HiExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Created</p>
                            <p className="text-slate-900 dark:text-white font-medium">
                                {new Date(product.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Last Updated</p>
                            <p className="text-slate-900 dark:text-white font-medium">
                                {new Date(product.updated_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="btn-secondary w-full"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
