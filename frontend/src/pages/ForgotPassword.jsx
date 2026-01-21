import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { HiMail, HiArrowLeft } from 'react-icons/hi';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { forgotPassword } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const result = await forgotPassword(email);

        if (result.success) {
            setIsSubmitted(true);
            toast.success('Check your email for reset instructions');
        } else {
            toast.error(result.error);
        }

        setIsLoading(false);
    };

    if (isSubmitted) {
        return (
            <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Check your email</h2>
                    <p className="text-slate-400 mt-2">
                        We've sent password reset instructions to<br />
                        <span className="text-white font-medium">{email}</span>
                    </p>
                </div>
                <Link to="/login" className="btn-secondary inline-flex items-center gap-2">
                    <HiArrowLeft className="w-4 h-4" />
                    Back to login
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white">Reset your password</h2>
                <p className="text-slate-400 mt-2">Enter your email and we'll send you reset instructions</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                            Sending...
                        </span>
                    ) : (
                        'Send reset link'
                    )}
                </button>
            </form>

            <Link to="/login" className="flex items-center justify-center gap-2 text-slate-400 hover:text-white">
                <HiArrowLeft className="w-4 h-4" />
                Back to login
            </Link>
        </div>
    );
}
