import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useEffect } from 'react';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';
import WinningProducts from './pages/WinningProducts';
import ImportedProducts from './pages/ImportedProducts';
import Stores from './pages/Stores';
import Orders from './pages/Orders';
import Analytics from './pages/Analytics';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Landing from './pages/Landing';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

function App() {
    const { isDark } = useThemeStore();
    const { checkAuth } = useAuthStore();

    useEffect(() => {
        // Check authentication on app load
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        // Apply dark mode class to html element
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    return (
        <Router>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: isDark ? '#1e293b' : '#ffffff',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    },
                    success: {
                        iconTheme: {
                            primary: '#22c55e',
                            secondary: '#ffffff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#ffffff',
                        },
                    },
                }}
            />

            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />

                {/* Auth routes */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                </Route>

                {/* Protected dashboard routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/products/search" element={<ProductSearch />} />
                    <Route path="/products/winning" element={<WinningProducts />} />
                    <Route path="/products/imported" element={<ImportedProducts />} />
                    <Route path="/stores" element={<Stores />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/settings" element={<Settings />} />
                </Route>

                {/* Subscription callbacks */}
                <Route path="/subscription/success" element={<Navigate to="/subscription?success=true" replace />} />
                <Route path="/subscription/cancel" element={<Navigate to="/subscription?cancelled=true" replace />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
