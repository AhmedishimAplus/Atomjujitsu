import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from './ui/Button';
import Input from './ui/Input';
import { verifyEmail, resendVerification } from '../services/api';

const VerifyEmailPage: React.FC = () => {
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Extract email from URL query parameters
        const params = new URLSearchParams(location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit verification code');
            setLoading(false);
            return;
        }

        try {
            await verifyEmail(email, otp);
            // Redirect to login page after successful verification
            navigate('/login?verified=true');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        try {
            setLoading(true);
            await resendVerification(email);
            setError('');
            alert('Verification code has been resent to your email');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to resend verification code');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
                    <h2 className="text-3xl font-bold mb-4 text-center text-gray-800">Verify Your Email</h2>
                    <p className="text-gray-600 mb-8 text-center">
                        We've sent a 6-digit code to<br />
                        <span className="font-medium">{email}</span>
                    </p>

                    <div className="mb-6">
                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                            Enter Verification Code
                        </label>                        <div className="flex justify-center">
                            <div className="grid grid-cols-6 gap-2">
                                {[...Array(6)].map((_, index) => (
                                    <Input
                                        key={index}
                                        type="text"
                                        value={otp[index] || ''}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^0-9]/g, '');
                                            if (value) {
                                                // Update the current digit
                                                const newOtp = otp.split('');
                                                newOtp[index] = value[0];
                                                setOtp(newOtp.join(''));

                                                // Move focus to next input if available
                                                if (index < 5 && value) {
                                                    const nextInput = document.getElementById(`otp-${index + 1}`);
                                                    if (nextInput) nextInput.focus();
                                                }
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            // Handle backspace to go to previous input
                                            if (e.key === 'Backspace' && !otp[index] && index > 0) {
                                                const prevInput = document.getElementById(`otp-${index - 1}`);
                                                if (prevInput) prevInput.focus();
                                            }
                                        }}
                                        id={`otp-${index}`}
                                        required
                                        className="w-12 h-12 text-center text-xl font-bold"
                                        maxLength={1}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </Button>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 mb-4">
                            Didn't receive the code?
                        </p>
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={loading}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            Resend Code
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// API function is now imported from services/api.ts

export default VerifyEmailPage;
