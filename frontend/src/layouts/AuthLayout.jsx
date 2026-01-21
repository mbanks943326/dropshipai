import { Outlet, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { HiMoon, HiSun } from 'react-icons/hi';

export default function AuthLayout() {
    const { isAuthenticated } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 p-12 flex-col justify-between relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-2xl">D</span>
                        </div>
                        <span className="text-3xl font-bold text-white">DropShipAI</span>
                    </Link>
                </div>

                <div className="relative space-y-6">
                    <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                        AI-Powered <br />
                        <span className="gradient-text">Dropshipping</span> <br />
                        Made Simple
                    </h1>
                    <p className="text-lg text-slate-400 max-w-md">
                        Discover winning products, automate your store, and scale your e-commerce business with artificial intelligence.
                    </p>

                    <div className="flex gap-4 pt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-slate-300 text-sm">AI Product Analysis</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-slate-300 text-sm">Auto Fulfillment</span>
                        </div>
                    </div>
                </div>

                <div className="relative text-slate-500 text-sm">
                    © 2026 DropShipAI. All rights reserved.
                </div>
            </div>

            {/* Right side - Auth form */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Link to="/" className="inline-flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">D</span>
                            </div>
                            <span className="text-2xl font-bold text-white">DropShipAI</span>
                        </Link>
                    </div>

                    {/* Theme toggle */}
                    <div className="absolute top-6 right-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                        >
                            {isDark ? <HiSun className="w-5 h-5" /> : <HiMoon className="w-5 h-5" />}
                        </button>
                    </div>

                    <Outlet />
                </div>
            </div>
        </div>
    );
}
