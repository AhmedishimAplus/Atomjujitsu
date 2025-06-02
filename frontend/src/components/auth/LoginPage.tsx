import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
    const { state, login, clearError, resendVerification } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [showResendForm, setShowResendForm] = useState(false);
    const [resendEmail, setResendEmail] = useState('');
    const [resendMessage, setResendMessage] = useState('');
    const [resendError, setResendError] = useState('');  // Clear any errors on mount and handle lint warnings about missing deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        clearError();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (state.requires2FA) {
            // Submit with 2FA token
            await login({ email, password, twoFactorToken });
        } else {
            // Regular login
            await login({ email, password });
        }
    };

    const handleResendVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setResendMessage('');
        setResendError('');

        if (!resendEmail) {
            setResendError('Please enter your email address');
            return;
        }

        try {
            await resendVerification(resendEmail);
            setResendMessage('Verification email has been sent. Please check your inbox.');
        } catch (error: any) {
            setResendError(error.message || 'Failed to resend verification email');
        }
    };

    // If showing resend verification form
    if (showResendForm) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
                    <div className="flex justify-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-800">AtomJujitsu POS</h1>
                    </div>

                    <h2 className="text-center text-xl font-semibold text-gray-700 mb-6">
                        Resend Verification Email
                    </h2>

                    {resendMessage && (
                        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                            {resendMessage}
                        </div>
                    )}

                    {resendError && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {resendError}
                        </div>
                    )}

                    <form onSubmit={handleResendVerification} className="space-y-4">
                        <div>
                            <label htmlFor="resendEmail" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                id="resendEmail"
                                type="email"
                                value={resendEmail}
                                onChange={(e) => setResendEmail(e.target.value)}
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setShowResendForm(false)}
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Back to Login
                            </button>

                            <button
                                type="submit"
                                disabled={state.loading}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {state.loading ? 'Sending...' : 'Resend Email'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
                <div className="flex justify-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">AtomJujitsu POS</h1>
                </div>

                <h2 className="text-center text-xl font-semibold text-gray-700 mb-6">
                    {state.requires2FA ? 'Enter 2FA Code' : 'Sign In'}
                </h2>

                {state.error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {state.error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!state.requires2FA ? (
                        <>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label htmlFor="twoFactorToken" className="block text-sm font-medium text-gray-700">
                                Two-Factor Authentication Code
                            </label>
                            <input
                                id="twoFactorToken"
                                type="text"
                                value={twoFactorToken}
                                onChange={(e) => setTwoFactorToken(e.target.value)}
                                required
                                placeholder="Enter 6-digit code"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Enter the code from your authenticator app
                            </p>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={state.loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {state.loading ? 'Loading...' : state.requires2FA ? 'Verify' : 'Sign In'}
                        </button>
                    </div>

                    {!state.requires2FA && (
                        <div className="flex items-center justify-between mt-4">
                            <button
                                type="button"
                                onClick={() => setShowResendForm(true)}
                                className="text-sm text-blue-600 hover:text-blue-500"
                            >
                                Need verification email?
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
