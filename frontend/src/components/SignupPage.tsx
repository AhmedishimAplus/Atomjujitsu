import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import Button from './ui/Button';
import Input from './ui/Input';

const SignupPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Form validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            // Register with fixed role as 'Cashier'
            await register({
                name,
                email,
                password,
                phone,
                role: 'Cashier'
            });

            // Navigate to the verification page with email
            navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Sign Up</h2>
                    <p className="text-gray-600 mb-6 text-center">Create your cashier account</p>

                    <div className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            className="w-full"
                        />

                        <Input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full"
                        />

                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="w-full"
                        />

                        <Input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            className="w-full"
                        />

                        <Input
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm mt-4">{error}</div>}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <a href="/login" className="text-blue-600 hover:underline">
                                Log in
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignupPage;
