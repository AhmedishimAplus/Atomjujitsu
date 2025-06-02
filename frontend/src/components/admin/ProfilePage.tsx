import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProfilePage: React.FC = () => {
    const { state, updateProfile, enable2FA, verify2FASetup, disable2FA, logout } = useAuth();
    const user = state.user;

    // Profile update state
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState('');

    // 2FA state
    const [showSetup2FA, setShowSetup2FA] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [twoFactorMessage, setTwoFactorMessage] = useState('');
    const [twoFactorError, setTwoFactorError] = useState('');

    // Handle profile update
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage('');
        setProfileError('');

        // Validate passwords if attempting to change
        if (newPassword) {
            if (!currentPassword) {
                setProfileError('Current password is required to set a new password');
                return;
            }

            if (newPassword !== confirmPassword) {
                setProfileError('New passwords do not match');
                return;
            }

            if (newPassword.length < 6) {
                setProfileError('New password must be at least 6 characters');
                return;
            }
        }

        try {
            const data = {
                name,
                email,
                ...(newPassword ? { currentPassword, newPassword } : {})
            };

            await updateProfile(data);
            setProfileMessage('Profile updated successfully');

            // Clear password fields after successful update
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setProfileError(error.message || 'Failed to update profile');
        }
    };

    // Handle 2FA setup initiation
    const handleEnable2FA = async () => {
        try {
            setTwoFactorError('');
            const { qrCode, secret } = await enable2FA();
            setQrCode(qrCode);
            setSecret(secret);
            setShowSetup2FA(true);
        } catch (error: any) {
            setTwoFactorError(error.message || 'Failed to initiate 2FA setup');
        }
    };

    // Handle 2FA verification and completion
    const handleVerify2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setTwoFactorMessage('');
        setTwoFactorError('');

        if (!verificationCode) {
            setTwoFactorError('Verification code is required');
            return;
        }

        try {
            await verify2FASetup(verificationCode);
            setTwoFactorMessage('Two-factor authentication enabled successfully');
            setShowSetup2FA(false);
            setVerificationCode('');
        } catch (error: any) {
            setTwoFactorError(error.message || 'Failed to verify 2FA code');
        }
    };

    // Handle 2FA disabling
    const handleDisable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setTwoFactorMessage('');
        setTwoFactorError('');

        if (!verificationCode) {
            setTwoFactorError('Verification code is required');
            return;
        }

        try {
            await disable2FA(verificationCode);
            setTwoFactorMessage('Two-factor authentication disabled successfully');
            setVerificationCode('');
        } catch (error: any) {
            setTwoFactorError(error.message || 'Failed to disable 2FA');
        }
    };

    if (!user) {
        return (
            <div className="p-6">
                <p>Please log in to view your profile.</p>
                <button
                    onClick={() => logout()}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-8">Your Profile</h1>

            {/* Profile Information */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Account Information</h2>

                {profileMessage && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                        {profileMessage}
                    </div>
                )}

                {profileError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {profileError}
                    </div>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

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

                    <div className="border-t border-gray-200 pt-4 mt-4">
                        <h3 className="text-lg font-medium mb-2">Change Password</h3>
                        <p className="text-sm text-gray-500 mb-4">Leave blank if you don't want to change your password</p>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                    Current Password
                                </label>
                                <input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                    New Password
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Confirm New Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={state.loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {state.loading ? 'Saving...' : 'Update Profile'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

                {twoFactorMessage && (
                    <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                        {twoFactorMessage}
                    </div>
                )}

                {twoFactorError && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {twoFactorError}
                    </div>
                )}

                <div className="mb-4">
                    <p className="mb-2">
                        Status: <span className={`font-semibold ${user.isTwoFactorEnabled ? 'text-green-600' : 'text-yellow-600'}`}>
                            {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </p>
                    <p className="text-sm text-gray-600">
                        Two-factor authentication adds an extra layer of security to your account by requiring a verification code
                        in addition to your password when you sign in.
                    </p>
                </div>

                {showSetup2FA ? (
                    <div className="space-y-4">
                        <div className="border p-4 rounded bg-gray-50">
                            <p className="font-medium mb-2">Scan this QR code with your authenticator app:</p>
                            <div className="flex justify-center my-4">
                                <img src={qrCode} alt="QR Code for 2FA" className="border" />
                            </div>

                            <div className="mb-4">
                                <p className="text-sm text-gray-700 mb-1">Or enter this code manually:</p>
                                <p className="font-mono bg-white p-2 border rounded text-center">{secret}</p>
                            </div>

                            <p className="text-sm text-gray-600">
                                After scanning the QR code or entering the code manually, your authenticator app will display a
                                6-digit code that you need to enter below to verify setup.
                            </p>
                        </div>

                        <form onSubmit={handleVerify2FA} className="space-y-4">
                            <div>
                                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                                    Verification Code
                                </label>
                                <input
                                    id="verificationCode"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                    placeholder="Enter 6-digit code"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowSetup2FA(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={state.loading}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {state.loading ? 'Verifying...' : 'Verify & Enable'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : user.isTwoFactorEnabled ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            If you want to disable two-factor authentication, enter a verification code from your authenticator app
                            and click the button below.
                        </p>

                        <form onSubmit={handleDisable2FA} className="space-y-4">
                            <div>
                                <label htmlFor="disableCode" className="block text-sm font-medium text-gray-700">
                                    Verification Code
                                </label>
                                <input
                                    id="disableCode"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                    placeholder="Enter 6-digit code"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={state.loading}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                >
                                    {state.loading ? 'Disabling...' : 'Disable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <button
                            onClick={handleEnable2FA}
                            disabled={state.loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {state.loading ? 'Processing...' : 'Enable 2FA'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
