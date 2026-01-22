import { useState, useEffect } from 'react';
import { productsAPI, storesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { HiSearch, HiFilter, HiStar, HiShoppingCart, HiExternalLink, HiSparkles, HiCheck } from 'react-icons/hi';

export default function ProductSearch() {
    const [query, setQuery] = useState('');
    const [source, setSource] = useState('all');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stores, setStores] = useState([]);
    const [importingProducts, setImportingProducts] = useState(new Set());
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        minRating: '',
        category: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Fetch stores on mount
    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const response = await storesAPI.getAll();
            if (response.data.success) {
                setStores(response.data.data.stores || []);
            }
        } catch (error) {
            console.error('Failed to fetch stores:', error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            toast.error('Please enter a search term');
            return;
        }

        setLoading(true);
        try {
            const response = await productsAPI.search({
                q: query,
                source,
                ...filters
            });
            setProducts(response.data.data.products);
            if (response.data.data.products.length === 0) {
                toast('No products found. Try different keywords.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (product) => {
        // Check if there are connected stores
        if (stores.length === 0) {
            toast.error('Please connect a store first in the Stores section.');
            return;
        }

        // Mark product as importing
        setImportingProducts(prev => new Set([...prev, product.externalId]));

        try {
            const response = await productsAPI.import({
                productData: product,
                storeId: stores[0].id // Use first available store
            });

            if (response.data.success) {
                toast.success('Product imported successfully!');
            } else {
                toast.error('Failed to import product');
            }
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to import product');
        } finally {
            setImportingProducts(prev => {
                const newSet = new Set(prev);
                newSet.delete(product.externalId);
                return newSet;
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="page-title">Product Search</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Search for products across Amazon, AliExpress, and Temu
                </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="card">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for products... (e.g., wireless earbuds, yoga mat)"
                            className="input pl-12 py-3"
                        />
                    </div>

                    <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="input w-full lg:w-48"
                    >
                        <option value="all">All Sources</option>
                        <option value="amazon">Amazon</option>
                        <option value="aliexpress">AliExpress</option>
                        <option value="temu">Temu</option>
                    </select>

                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
                    >
                        <HiFilter className="w-5 h-5 mr-2" />
                        Filters
                    </button>

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        ) : (
                            <>
                                <HiSearch className="w-5 h-5 mr-2" />
                                Search
                            </>
                        )}
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div>
                            <label className="label">Min Price</label>
                            <input
                                type="number"
                                value={filters.minPrice}
                                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                placeholder="$0"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Max Price</label>
                            <input
                                type="number"
                                value={filters.maxPrice}
                                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                placeholder="$500"
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="label">Min Rating</label>
                            <select
                                value={filters.minRating}
                                onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                                className="input"
                            >
                                <option value="">Any</option>
                                <option value="3">3+ stars</option>
                                <option value="4">4+ stars</option>
                                <option value="4.5">4.5+ stars</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <input
                                type="text"
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                placeholder="Electronics, Fashion..."
                                className="input"
                            />
                        </div>
                    </div>
                )}
            </form>

            {/* Results */}
            {products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.externalId} className="card-hover group overflow-hidden">
                            {/* Image */}
                            <div className="relative -mx-6 -mt-6 mb-4 aspect-square bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <img
                                    src={product.mainImage || 'https://via.placeholder.com/400'}
                                    alt={product.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium ${product.source === 'amazon' ? 'bg-orange-500 text-white' :
                                    product.source === 'aliexpress' ? 'bg-red-500 text-white' :
                                        'bg-purple-500 text-white'
                                    }`}>
                                    {product.source.charAt(0).toUpperCase() + product.source.slice(1)}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                                <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary-500">
                                    {product.title}
                                </h3>

                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                                        ${product.price?.toFixed(2)}
                                    </span>
                                    {product.originalPrice > product.price && (
                                        <span className="text-sm text-slate-500 line-through">
                                            ${product.originalPrice?.toFixed(2)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <HiStar className="w-4 h-4 text-amber-500" />
                                        {product.rating?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span>
                                        {product.reviewsCount?.toLocaleString() || 0} reviews
                                    </span>
                                </div>

                                {product.salesCount > 0 && (
                                    <p className="text-sm text-green-500 font-medium">
                                        {product.salesCount.toLocaleString()} sold
                                    </p>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleImport(product)}
                                        className="btn-primary btn-sm flex-1"
                                    >
                                        <HiShoppingCart className="w-4 h-4 mr-1" />
                                        Import
                                    </button>
                                    <a
                                        href={product.supplierUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary btn-sm"
                                    >
                                        <HiExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && query && (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiSearch className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No products found</h3>
                    <p className="text-slate-500">Try different keywords or adjust your filters</p>
                </div>
            )}

            {/* Initial State */}
            {!loading && products.length === 0 && !query && (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiSparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Start searching for products</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Enter keywords above to find products from Amazon, AliExpress, and Temu. Use filters to narrow down your results.
                    </p>
                </div>
            )}
        </div>
    );
}
