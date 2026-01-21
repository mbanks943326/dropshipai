import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productsAPI, aiAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { HiStar, HiLightningBolt, HiTrendingUp, HiShoppingCart, HiSparkles, HiLockClosed } from 'react-icons/hi';

export default function WinningProducts() {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(null);
    const isPro = user?.subscription_tier === 'pro';

    useEffect(() => {
        fetchWinningProducts();
    }, []);

    const fetchWinningProducts = async () => {
        try {
            const response = await productsAPI.getWinning({ limit: 20 });
            setProducts(response.data.data.products);
        } catch (error) {
            toast.error('Failed to load winning products');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (productId) => {
        if (!isPro) {
            toast.error('AI analysis requires Pro subscription');
            return;
        }

        setAnalyzing(productId);
        try {
            const response = await aiAPI.analyze(productId);
            const analysis = response.data.data.analysis;

            // Update product in list
            setProducts(products.map(p =>
                p.id === productId
                    ? { ...p, ai_score: analysis.score, ai_analysis: analysis }
                    : p
            ));

            toast.success(`AI Score: ${analysis.score}/100`);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Analysis failed');
        } finally {
            setAnalyzing(null);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
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
                        <HiStar className="w-8 h-8 text-amber-500" />
                        Winning Products
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        AI-curated products with high profit potential
                    </p>
                </div>

                {!isPro && (
                    <Link to="/subscription" className="btn-accent inline-flex items-center">
                        <HiSparkles className="w-5 h-5 mr-2" />
                        Upgrade for Full AI Access
                    </Link>
                )}
            </div>

            {/* Pro Feature Banner */}
            {!isPro && (
                <div className="card bg-gradient-to-r from-primary-500/10 to-accent-500/10 border-primary-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                            <HiLockClosed className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Unlock AI-Powered Recommendations</h3>
                            <p className="text-sm text-slate-500">Get personalized product recommendations, detailed analysis, and marketing suggestions.</p>
                        </div>
                        <Link to="/subscription" className="btn-primary">
                            Upgrade to Pro
                        </Link>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="card-hover group overflow-hidden">
                            {/* Image */}
                            <div className="relative -mx-6 -mt-6 mb-4 aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <img
                                    src={product.main_image || 'https://via.placeholder.com/400x300'}
                                    alt={product.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />

                                {/* AI Score Badge */}
                                {product.ai_score && (
                                    <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg">
                                        <span className={`text-lg font-bold ${getScoreColor(product.ai_score)}`}>
                                            {product.ai_score}
                                        </span>
                                        <span className="text-white/70 text-sm">/100</span>
                                    </div>
                                )}

                                {/* Source Badge */}
                                <span className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium ${product.source === 'amazon' ? 'bg-orange-500 text-white' :
                                        product.source === 'aliexpress' ? 'bg-red-500 text-white' :
                                            'bg-purple-500 text-white'
                                    }`}>
                                    {product.source}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                                <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                                    {product.title}
                                </h3>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                                            ${parseFloat(product.price).toFixed(2)}
                                        </span>
                                        {product.original_price > product.price && (
                                            <span className="text-sm text-slate-500 line-through">
                                                ${parseFloat(product.original_price).toFixed(2)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 text-sm">
                                        <HiStar className="w-4 h-4 text-amber-500" />
                                        <span className="text-slate-600 dark:text-slate-400">
                                            {product.rating?.toFixed(1) || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* AI Analysis Preview */}
                                {product.ai_analysis && (
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                                        <div className="flex items-center gap-2">
                                            <HiTrendingUp className="w-4 h-4 text-green-500" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                Profit: {product.ai_analysis.profitPotential?.rating}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <HiLightningBolt className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                Demand: {product.ai_analysis.marketAnalysis?.demandLevel}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => handleAnalyze(product.id)}
                                        disabled={analyzing === product.id}
                                        className={`btn-sm flex-1 ${product.ai_analysis ? 'btn-secondary' : 'btn-primary'}`}
                                    >
                                        {analyzing === product.id ? (
                                            <svg className="animate-spin w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                            </svg>
                                        ) : (
                                            <>
                                                <HiSparkles className="w-4 h-4 mr-1" />
                                                {product.ai_analysis ? 'Re-analyze' : 'AI Analysis'}
                                            </>
                                        )}
                                    </button>
                                    <button className="btn-accent btn-sm">
                                        <HiShoppingCart className="w-4 h-4 mr-1" />
                                        Import
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <HiStar className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No winning products yet</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                        Start by searching for products. Our AI will analyze and identify the best opportunities for you.
                    </p>
                    <Link to="/products/search" className="btn-primary">
                        Search Products
                    </Link>
                </div>
            )}
        </div>
    );
}
