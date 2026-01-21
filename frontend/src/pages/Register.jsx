import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { HiMail, HiLockClosed, HiUser, HiEye, HiEyeOff } from 'react-icons/hi';
import { FcGoogle } from 'react-icons/fc';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const { register } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }

        if (!acceptTerms) {
            toast.error('Please accept the terms and conditions');
            return;
        }

        setIsLoading(true);

        const result = await register(email, password, fullName);

        if (result.success) {
            toast.success('Account created successfully!');
        } else {
            toast.error(result.error);
        }

        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Create your account</h2>
                <p className="text-slate-400 mt-2">Start your free trial today</p>
            </div>

            {/* Google Signup Button */}
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-medium transition-colors">
                <FcGoogle className="w-5 h-5" />
                Continue with Google
            </button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900 text-slate-500">or register with email</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Full name
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <HiUser className="w-5 h-5 text-slate-500" />
                        </div>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="input pl-10 bg-slate-800 border-slate-700 text-white"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Email address
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <HiMail className="w-5 h-5 text-slate-500" />
                        </div>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input pl-10 bg-slate-800 border-slate-700 text-white"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <HiLockClosed className="w-5 h-5 text-slate-500" />
                        </div>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input pl-10 pr-10 bg-slate-800 border-slate-700 text-white"
                            placeholder="••••••••"
                            required
                            minLength={8}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                            {showPassword ? (
                                <HiEyeOff className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                            ) : (
                                <HiEye className="w-5 h-5 text-slate-500 hover:text-slate-400" />
                            )}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Confirm password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <HiLockClosed className="w-5 h-5 text-slate-500" />
                        </div>
                        <input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input pl-10 bg-slate-800 border-slate-700 text-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <label className="flex items-start gap-2">
                    <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-400">
                        I agree to the{' '}
                        <a href="#" className="text-primary-400 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-primary-400 hover:underline">Privacy Policy</a>
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Creating account...
                        </span>
                    ) : (
                        'Create account'
                    )}
                </button>
            </form>

            <p className="text-center text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
