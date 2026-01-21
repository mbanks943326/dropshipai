import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import {
    HiHome,
    HiSearch,
    HiStar,
    HiCollection,
    HiShoppingBag,
    HiClipboardList,
    HiChartBar,
    HiCreditCard,
    HiCog,
    HiLogout,
    HiMenu,
    HiX,
    HiMoon,
    HiSun,
    HiBell,
    HiUser
} from 'react-icons/hi';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HiHome },
    { name: 'Product Search', href: '/products/search', icon: HiSearch },
    { name: 'Winning Products', href: '/products/winning', icon: HiStar },
    { name: 'My Products', href: '/products/imported', icon: HiCollection },
    { name: 'Stores', href: '/stores', icon: HiShoppingBag },
    { name: 'Orders', href: '/orders', icon: HiClipboardList },
    { name: 'Analytics', href: '/analytics', icon: HiChartBar },
    { name: 'Subscription', href: '/subscription', icon: HiCreditCard },
];

export default function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">D</span>
                            </div>
                            <span className="text-xl font-bold gradient-text">DropShipAI</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <HiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <Link
                            to="/settings"
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white font-medium">
                                {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {user?.full_name || 'User'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                            </div>
                            <HiCog className="w-5 h-5 text-slate-400" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-72">
                {/* Top header */}
                <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between h-full px-4 lg:px-8">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <HiMenu className="w-6 h-6" />
                        </button>

                        {/* Subscription badge */}
                        <div className="hidden lg:flex items-center">
                            {user?.subscription_tier === 'pro' ? (
                                <span className="badge bg-gradient-to-r from-primary-500 to-accent-500 text-white px-3 py-1">
                                    PRO
                                </span>
                            ) : (
                                <Link
                                    to="/subscription"
                                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                                >
                                    Upgrade to Pro →
                                </Link>
                            )}
                        </div>

                        {/* Right section */}
                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                title={isDark ? 'Light mode' : 'Dark mode'}
                            >
                                {isDark ? (
                                    <HiSun className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <HiMoon className="w-5 h-5 text-slate-600" />
                                )}
                            </button>

                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                <HiBell className="w-5 h-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
                            </button>

                            {/* Profile dropdown */}
                            <div className="relative group">
                                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                                    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {user?.full_name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                </button>

                                {/* Dropdown menu */}
                                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                    <Link
                                        to="/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <HiUser className="w-4 h-4" />
                                        Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <HiLogout className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
