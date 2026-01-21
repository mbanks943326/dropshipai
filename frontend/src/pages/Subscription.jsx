import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { subscriptionsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { HiCreditCard, HiCheck, HiSparkles, HiLightningBolt } from 'react-icons/hi';

export default function Subscription() {
    const { user } = useAuthStore();
    const [searchParams] = useSearchParams();
    const [subscription, setSubscription] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const isPro = user?.subscription_tier === 'pro';

    useEffect(() => {
        fetchSubscription();

        // Handle success/cancel from Stripe
        if (searchParams.get('success')) {
            toast.success('Subscription activated! Welcome to Pro.');
        }
        if (searchParams.get('cancelled')) {
            toast('Checkout cancelled');
        }
    }, [searchParams]);

    const fetchSubscription = async () => {
        try {
            const response = await subscriptionsAPI.getStatus();
            setSubscription(response.data.data.subscription);
            setUsage(response.data.data.usage);
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        setCheckoutLoading(true);
        try {
            const response = await subscriptionsAPI.checkout('pro');
            window.location.href = response.data.data.url;
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Checkout failed');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleManage = async () => {
        try {
            const response = await subscriptionsAPI.getPortal();
            window.location.href = response.data.data.url;
        } catch (error) {
            toast.error('Failed to open billing portal');
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your subscription?')) return;
        try {
            await subscriptionsAPI.cancel();
            toast.success('Subscription will be cancelled at end of billing period');
            fetchSubscription();
        } catch (error) {
            toast.error('Failed to cancel subscription');
        }
    };

    const plans = [
        {
            name: 'Free',
            price: 0,
            current: !isPro,
            features: [
                '10 product searches per day',
                '5 product imports per day',
                '3 AI analyses per day',
                'Basic analytics',
                '1 store connection'
            ]
        },
        {
            name: 'Pro',
            price: 19,
            current: isPro,
            popular: true,
            features: [
                'Unlimited product searches',
                'Unlimited product imports',
                'Unlimited AI analyses',
                'Advanced analytics & reports',
                'Unlimited store connections',
                'Auto-fulfillment',
                'Priority support',
                'AI marketing suggestions'
            ]
        }
    ];

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse mb-6"></div>
                <div className="grid md:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <HiCreditCard className="w-8 h-8 text-primary-500" />
                    Subscription
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your subscription and billing
                </p>
            </div>

            {/* Current Plan Status */}
            {isPro && subscription && (
                <div className="card bg-gradient-to-r from-primary-500/10 to-accent-500/10 border-primary-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                                <HiSparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">Pro Subscription Active</h3>
                                <p className="text-sm text-slate-500">
                                    {subscription.cancel_at_period_end
                                        ? `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                                        : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleManage} className="btn-secondary btn-sm">
                                Manage Billing
                            </button>
                            {!subscription.cancel_at_period_end && (
                                <button onClick={handleCancel} className="btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-4">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Stats */}
            {usage && !isPro && (
                <div className="card">
                    <h3 className="section-title mb-4">Today's Usage</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {Object.entries(usage).map(([action, data]) => (
                            <div key={action} className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {data.used}/{data.limit === 'unlimited' ? '∞' : data.limit}
                                </p>
                                <p className="text-sm text-slate-500 capitalize mt-1">
                                    {action.replace('_', ' ')}
                                </p>
                                {data.limit !== 'unlimited' && (
                                    <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${data.used >= data.limit ? 'bg-red-500' : 'bg-primary-500'
                                                }`}
                                            style={{ width: `${Math.min((data.used / data.limit) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Plans */}
            <div className="grid md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`card relative ${plan.popular
                                ? 'border-primary-500 dark:border-primary-400 bg-gradient-to-b from-primary-50 to-white dark:from-primary-900/20 dark:to-slate-800'
                                : ''
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full text-sm text-white font-medium">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                            <div className="mt-2">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">${plan.price}</span>
                                <span className="text-slate-500">/month</span>
                            </div>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <HiCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {plan.current ? (
                            <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">
                                Current Plan
                            </button>
                        ) : plan.name === 'Pro' ? (
                            <button
                                onClick={handleUpgrade}
                                disabled={checkoutLoading}
                                className="btn-primary w-full"
                            >
                                {checkoutLoading ? (
                                    <svg className="animate-spin w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <HiLightningBolt className="w-5 h-5 mr-2" />
                                        Upgrade to Pro
                                    </>
                                )}
                            </button>
                        ) : (
                            <button disabled className="btn-secondary w-full opacity-50 cursor-not-allowed">
                                Free Forever
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* FAQ */}
            <div className="card">
                <h3 className="section-title mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">Can I cancel anytime?</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-medium text-slate-900 dark:text-white">What payment methods do you accept?</h4>
                        <p className="text-sm text-slate-500 mt-1">
                            We accept all major credit cards through our secure payment partner, Stripe.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
