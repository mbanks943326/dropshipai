import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { HiArrowRight, HiStar, HiLightningBolt, HiChartBar, HiShieldCheck, HiCube, HiGlobe } from 'react-icons/hi';

export default function Landing() {
    const { isAuthenticated } = useAuthStore();

    const features = [
        {
            icon: HiStar,
            title: 'AI Product Discovery',
            description: 'Find winning products automatically with our advanced AI that analyzes trends, reviews, and sales data.'
        },
        {
            icon: HiLightningBolt,
            title: 'Auto Fulfillment',
            description: 'Automate order processing and fulfillment. When you make a sale, we handle the rest.'
        },
        {
            icon: HiChartBar,
            title: 'Smart Analytics',
            description: 'Track your performance with real-time analytics. Know your profits, best sellers, and ROI.'
        },
        {
            icon: HiShieldCheck,
            title: 'Multi-Platform',
            description: 'Connect with Shopify, WooCommerce, and eBay. Source from Amazon, AliExpress, and Temu.'
        },
        {
            icon: HiCube,
            title: 'Inventory Sync',
            description: 'Keep your inventory in sync across all platforms. Never oversell again.'
        },
        {
            icon: HiGlobe,
            title: 'Global Reach',
            description: 'Access suppliers worldwide and sell to customers anywhere in the world.'
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">D</span>
                            </div>
                            <span className="text-xl font-bold text-white">DropShipAI</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            {isAuthenticated ? (
                                <Link to="/dashboard" className="btn-primary">
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="text-slate-300 hover:text-white transition-colors">
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="btn-primary">
                                        Get Started Free
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-4 overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative max-w-7xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full text-sm text-slate-300 mb-8">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Powered by Google Gemini AI
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                        Dropshipping with<br />
                        <span className="gradient-text">Artificial Intelligence</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                        Find winning products, automate your store, and scale your e-commerce business
                        with the power of AI. From product discovery to order fulfillment.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/register" className="btn-primary btn-lg group">
                            Start Free Trial
                            <HiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a href="#features" className="btn-secondary btn-lg">
                            Learn More
                        </a>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
                        {[
                            { value: '50K+', label: 'Products Analyzed' },
                            { value: '10K+', label: 'Active Users' },
                            { value: '$2M+', label: 'Revenue Generated' },
                            { value: '99.9%', label: 'Uptime' }
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                                <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Everything You Need to Succeed
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">
                            A complete dropshipping solution powered by AI. From finding winning products
                            to automating fulfillment.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="group p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-primary-500/50 transition-all duration-300"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-20 px-4 bg-slate-800/30">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-slate-400">Start free, upgrade when you're ready</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Plan */}
                        <div className="p-8 bg-slate-800 border border-slate-700 rounded-2xl">
                            <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
                            <div className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-slate-400">/month</span></div>
                            <ul className="space-y-3 mb-8">
                                {['10 product searches/day', '5 product imports/day', '3 AI analyses/day', 'Basic analytics', '1 store connection'].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-300">
                                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="btn-secondary w-full">Get Started</Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="relative p-8 bg-gradient-to-br from-primary-900/50 to-accent-900/50 border border-primary-500/50 rounded-2xl">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full text-sm text-white font-medium">
                                Most Popular
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                            <div className="text-4xl font-bold text-white mb-6">$19<span className="text-lg text-slate-400">/month</span></div>
                            <ul className="space-y-3 mb-8">
                                {['Unlimited product searches', 'Unlimited product imports', 'Unlimited AI analyses', 'Advanced analytics & reports', 'Unlimited store connections', 'Auto-fulfillment', 'Priority support', 'AI marketing suggestions'].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-300">
                                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/register" className="btn-primary w-full">Start Free Trial</Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to Scale Your Business?
                    </h2>
                    <p className="text-slate-400 mb-8">
                        Join thousands of entrepreneurs who are using AI to build successful dropshipping businesses.
                    </p>
                    <Link to="/register" className="btn-primary btn-lg">
                        Get Started for Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">D</span>
                            </div>
                            <span className="text-xl font-bold text-white">DropShipAI</span>
                        </div>
                        <p className="text-slate-500 text-sm">
                            © 2026 DropShipAI. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
