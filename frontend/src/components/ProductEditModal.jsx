import { useState } from 'react';
import { HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { productsAPI } from '../services/api';

export default function ProductEditModal({ product, onClose, onSave }) {
    const [formData, setFormData] = useState({
        custom_title: product.custom_title || product.original_title || '',
        custom_description: product.custom_description || '',
        custom_price: parseFloat(product.custom_price || 0).toFixed(2),
        markup_percentage: parseFloat(product.markup_percentage || 30).toFixed(1),
    });
    const [loading, setLoading] = useState(false);

    const costPrice = parseFloat(product.cost_price || 0);

    // Calculate profit when price or markup changes
    const calculatePrice = (markup) => {
        return (costPrice * (1 + parseFloat(markup) / 100)).toFixed(2);
    };

    const calculateProfit = (sellingPrice) => {
        return (parseFloat(sellingPrice) - costPrice).toFixed(2);
    };

    const handleMarkupChange = (markup) => {
        const newPrice = calculatePrice(markup);
        setFormData({
            ...formData,
            markup_percentage: markup,
            custom_price: newPrice
        });
    };

    const handlePriceChange = (price) => {
        const newMarkup = ((parseFloat(price) - costPrice) / costPrice * 100).toFixed(1);
        setFormData({
            ...formData,
            custom_price: price,
            markup_percentage: newMarkup
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            toast.loading('Updating product...');
            await productsAPI.updateImported(product.id, formData);
            toast.dismiss();
            toast.success('Product updated successfully!');
            onSave();
            onClose();
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.message || 'Failed to update product');
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    const profit = calculateProfit(formData.custom_price);
    const profitMargin = ((profit / formData.custom_price) * 100).toFixed(1);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Product</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <HiX className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Product Preview */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                                src={product.main_image || 'https://via.placeholder.com/80'}
                                alt={product.custom_title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-500">Original Title</p>
                            <p className="font-medium text-slate-900 dark:text-white line-clamp-2">
                                {product.original_title}
                            </p>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Custom Title
                        </label>
                        <input
                            type="text"
                            value={formData.custom_title}
                            onChange={(e) => setFormData({ ...formData, custom_title: e.target.value })}
                            className="input-field"
                            placeholder="Enter custom product title"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Custom Description
                        </label>
                        <textarea
                            value={formData.custom_description}
                            onChange={(e) => setFormData({ ...formData, custom_description: e.target.value })}
                            className="input-field min-h-[120px]"
                            placeholder="Enter custom product description (optional)"
                            rows={4}
                        />
                    </div>

                    {/* Pricing */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-4">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Pricing</h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Cost Price (Read-only) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Cost Price
                                </label>
                                <input
                                    type="text"
                                    value={`$${costPrice.toFixed(2)}`}
                                    className="input-field bg-slate-100 dark:bg-slate-600"
                                    disabled
                                />
                            </div>

                            {/* Selling Price */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Selling Price
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min={costPrice}
                                        value={formData.custom_price}
                                        onChange={(e) => handlePriceChange(e.target.value)}
                                        className="input-field pl-7"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Markup Percentage */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Markup Percentage: {formData.markup_percentage}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="500"
                                step="0.5"
                                value={formData.markup_percentage}
                                onChange={(e) => handleMarkupChange(e.target.value)}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-slate-500 mt-1">
                                <span>0%</span>
                                <span>100%</span>
                                <span>200%</span>
                                <span>300%</span>
                                <span>500%</span>
                            </div>
                        </div>

                        {/* Profit Display */}
                        <div className="pt-4 border-t border-slate-200 dark:border-slate-600 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Profit per Unit</p>
                                <p className="text-lg font-bold text-green-500">${profit}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Profit Margin</p>
                                <p className="text-lg font-bold text-blue-500">{profitMargin}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
