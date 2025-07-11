import React, { useState } from 'react';
import { requestPasswordReset, resetPassword } from '../services/api';
import Input from './ui/Input';
import Button from './ui/Button';
import { Card } from './ui/Card';
import { Eye, EyeOff } from 'lucide-react';

enum PasswordResetStep {
    REQUEST_CODE,
    ENTER_CODE,
    SET_PASSWORD,
    COMPLETE
}

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [currentStep, setCurrentStep] = useState<PasswordResetStep>(PasswordResetStep.REQUEST_CODE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [requiresAuthenticator, setRequiresAuthenticator] = useState(false);

    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await requestPasswordReset(email);

            if (response.requiresAuthenticator) {
                setRequiresAuthenticator(true);
                setSuccess('Please use your authenticator app to generate a verification code');
                setCurrentStep(PasswordResetStep.ENTER_CODE); // Proceed to code entry for authenticator users too
            } else {
                setSuccess('A reset code has been sent to your email address');
                setCurrentStep(PasswordResetStep.ENTER_CODE);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to request password reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetCode.trim()) {
            setError('Please enter the reset code sent to your email');
            return;
        }

        // Proceed to password reset step
        setError('');
        setCurrentStep(PasswordResetStep.SET_PASSWORD);
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newPassword) {
            setError('Please enter a new password');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await resetPassword(email, resetCode, newPassword);
            setSuccess('Your password has been reset successfully');
            setCurrentStep(PasswordResetStep.COMPLETE);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case PasswordResetStep.REQUEST_CODE:
                return (
                    <form onSubmit={handleRequestCode}>
                        <div className="mb-4">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="w-full"
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </Button>
                        </div>

                        <div className="mt-4 text-center">
                            <a href="/login" className="text-sm text-blue-600 hover:underline">
                                Back to Login
                            </a>
                        </div>
                    </form>
                );

            case PasswordResetStep.ENTER_CODE:
                return (
                    <form onSubmit={handleVerifyCode}>
                        <div className="mb-4">
                            {requiresAuthenticator ? (
                                <p className="text-sm text-gray-600 mb-4">
                                    Please enter the 6-digit code from your authenticator app.
                                </p>
                            ) : (
                                <p className="text-sm text-gray-600 mb-4">
                                    We've sent a 6-digit code to {email}. Please enter it below.
                                </p>
                            )}
                            <label htmlFor="resetCode" className="block text-sm font-medium text-gray-700 mb-1">
                                {requiresAuthenticator ? 'Authenticator Code' : 'Reset Code'}
                            </label>
                            <Input
                                id="resetCode"
                                type="text"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter 6-digit code"
                                className="w-full tracking-widest text-center"
                                maxLength={6}
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                disabled={loading}
                            >
                                Verify Code
                            </Button>
                        </div>

                        <div className="mt-4 text-center space-x-4">
                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:underline"
                                onClick={() => setCurrentStep(PasswordResetStep.REQUEST_CODE)}
                            >
                                Change Email
                            </button>
                            <a href="/login" className="text-sm text-blue-600 hover:underline">
                                Back to Login
                            </a>
                        </div>
                    </form>
                );

            case PasswordResetStep.SET_PASSWORD:
                return (
                    <form onSubmit={handleResetPassword}>
                        <div className="mb-4">
                            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                New Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full pr-10"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Password must be at least 8 characters long
                            </p>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full pr-10"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                disabled={loading}
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </div>
                    </form>
                );

            case PasswordResetStep.COMPLETE:
                return (
                    <div className="text-center py-4">
                        <div className="text-green-500 mb-4 text-xl font-semibold">
                            Password Reset Complete
                        </div>
                        <p className="text-gray-600 mb-6">
                            Your password has been reset successfully. You can now login with your new password.
                        </p>
                        <Button
                            onClick={() => window.location.href = '/login'}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                        >
                            Return to Login
                        </Button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Reset Your Password</h2>
                    {requiresAuthenticator && (
                        <p className="mt-2 text-sm text-red-600">
                            Your account requires an authenticator app. Please use your authenticator to get a verification code.
                        </p>
                    )}
                </div>

                <Card className="bg-white p-8 rounded-lg shadow-md">
                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {renderStepContent()}
                </Card>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
