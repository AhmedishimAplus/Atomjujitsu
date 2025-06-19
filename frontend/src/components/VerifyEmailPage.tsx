import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from './ui/Button';
import Input from './ui/Input';
import { verifyEmail, resendVerification } from '../services/api';

const VerifyEmailPage: React.FC = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
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

        // Focus on the first input when the component mounts
        const firstInput = document.getElementById('otp-0');
        if (firstInput) {
            firstInput.focus();
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const otpValue = otp.join('');
        if (otpValue.length !== 6) {
            setError('Please enter a valid 6-digit verification code');
            setLoading(false);
            return;
        }

        try {
            await verifyEmail(email, otpValue);
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

    const focusInput = (index: number) => {
        const input = document.getElementById(`otp-${index}`) as HTMLInputElement;
        if (input) {
            input.focus();
        }
    };

    const handleChange = (index: number, value: string) => {
        // Only allow numbers
        if (value && !/^\d+$/.test(value)) return;

        // Update the digit at the current index
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // If a digit was entered and there's a next input, focus on it
        if (value && index < 5) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            // If the current input has a value, clear it
            if (otp[index]) {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            } 
            // If the current input is empty and not the first, move to previous
            else if (index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                focusInput(index - 1);
            }
        } 
        // Allow arrow key navigation
        else if (e.key === 'ArrowLeft' && index > 0) {
            focusInput(index - 1);
        } 
        else if (e.key === 'ArrowRight' && index < 5) {
            focusInput(index + 1);
        }
    };

    // Handle paste event to fill multiple boxes at once
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const pastedDigits = pastedData.replace(/\D/g, '').split('').slice(0, 6);
        
        if (pastedDigits.length) {
            const newOtp = [...otp];
            pastedDigits.forEach((digit, i) => {
                if (i < 6) newOtp[i] = digit;
            });
            setOtp(newOtp);
            
            // Focus on the next empty input or the last one
            const nextEmptyIndex = newOtp.findIndex(digit => !digit);
            if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
                focusInput(nextEmptyIndex);
            } else {
                focusInput(5);
            }
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
                        <label htmlFor="otp-0" className="block text-sm font-medium text-gray-700 mb-1">
                            Enter Verification Code
                        </label>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-6 gap-2">
                                {otp.map((digit, index) => (
                                    <Input
                                        key={index}
                                        type="text"
                                        id={`otp-${index}`}
                                        value={digit}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
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

export default VerifyEmailPage;
