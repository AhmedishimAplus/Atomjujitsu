import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api';
import Button from './ui/Button';
import Input from './ui/Input';
import { useAppContext } from '../context/AppContext';
import { Coffee } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { dispatch } = useAppContext();

    useEffect(() => {
        // Check if user just verified their email
        const params = new URLSearchParams(location.search);
        const verified = params.get('verified') === 'true';

        if (verified) {
            setSuccess('Email verified successfully! You can now log in.');
        }
    }, [location]); const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const data = await login(email, password);
            localStorage.setItem('token', data.token);

            // Store user data in context
            dispatch({
                type: 'SET_USER',
                payload: data.user
            });

            // Set initial view based on role
            if (data.user.role === 'Cashier') {
                dispatch({ type: 'SET_VIEW', payload: 'cashier' });
            }

            navigate('/');
        } catch (err: any) {            // Check if 2FA is required
            if (err.response?.data?.requires2FA) {
                // Navigate to 2FA verification page with email and password
                navigate('/verify-2fa', { state: { email, password } });
                return;
            }

            // Check if account is locked
            if (err.response?.data?.accountLocked) {
                const lockTime = err.response?.data?.lockTime || 15;
                setError(`Account temporarily locked. Please try again in ${lockTime} minutes.`);
                return;
            }

            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
                        <Coffee size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">POS System</h1>
                </div>

                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm mt-4">{error}</div>}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-gray-600">
                            <a href="/forgot-password" className="text-blue-600 hover:underline">
                                Forgot your password?
                            </a>
                        </p>
                        <p className="text-gray-600">
                            Don't have an account?{' '}
                            <a href="/signup" className="text-blue-600 hover:underline">
                                Sign up
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
