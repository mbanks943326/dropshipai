import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';
import { HiCog, HiUser, HiMoon, HiSun, HiBell, HiShieldCheck, HiTrash } from 'react-icons/hi';

export default function Settings() {
    const { user, updateProfile, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [saving, setSaving] = useState(false);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        const result = await updateProfile({ fullName });
        if (result.success) {
            toast.success('Profile updated');
        } else {
            toast.error(result.error);
        }
        setSaving(false);
    };

    const handleDeleteAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
        toast.error('Account deletion requires contacting support');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <HiCog className="w-8 h-8 text-slate-500" />
                    Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage your account settings and preferences
                </p>
            </div>

            {/* Profile Section */}
            <div className="card">
                <h2 className="section-title flex items-center gap-2 mb-6">
                    <HiUser className="w-5 h-5" />
                    Profile
                </h2>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">{user?.email}</p>
                            <p className="text-sm text-slate-500">
                                {user?.subscription_tier === 'pro' ? 'Pro Member' : 'Free Member'}
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="input"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="input bg-slate-100 dark:bg-slate-700 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                    </div>

                    <button type="submit" disabled={saving} className="btn-primary">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>

            {/* Appearance */}
            <div className="card">
                <h2 className="section-title flex items-center gap-2 mb-6">
                    {isDark ? <HiMoon className="w-5 h-5" /> : <HiSun className="w-5 h-5" />}
                    Appearance
                </h2>

                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                        <p className="text-sm text-slate-500">Switch between light and dark theme</p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`relative w-14 h-7 rounded-full transition-colors ${isDark ? 'bg-primary-500' : 'bg-slate-200'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-7' : ''
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <div className="card">
                <h2 className="section-title flex items-center gap-2 mb-6">
                    <HiBell className="w-5 h-5" />
                    Notifications
                </h2>

                <div className="space-y-4">
                    {[
                        { label: 'Order updates', desc: 'Get notified when orders are placed or shipped' },
                        { label: 'Product alerts', desc: 'Alerts for winning products and price changes' },
                        { label: 'Marketing tips', desc: 'AI-powered marketing suggestions' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-sm text-slate-500">{item.desc}</p>
                            </div>
                            <input
                                type="checkbox"
                                defaultChecked
                                className="w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Security */}
            <div className="card">
                <h2 className="section-title flex items-center gap-2 mb-6">
                    <HiShieldCheck className="w-5 h-5" />
                    Security
                </h2>

                <div className="space-y-4">
                    <button className="btn-secondary w-full">
                        Change Password
                    </button>
                    <button className="btn-secondary w-full">
                        Enable Two-Factor Authentication
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card border-red-200 dark:border-red-900/50">
                <h2 className="section-title flex items-center gap-2 mb-6 text-red-500">
                    <HiTrash className="w-5 h-5" />
                    Danger Zone
                </h2>

                <p className="text-sm text-slate-500 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                </p>

                <button onClick={handleDeleteAccount} className="btn-danger">
                    Delete Account
                </button>
            </div>

            {/* Logout */}
            <button
                onClick={logout}
                className="btn-secondary w-full"
            >
                Sign Out
            </button>
        </div>
    );
}
