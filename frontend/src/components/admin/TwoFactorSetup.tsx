import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { enable2FA, verify2FASetup, disable2FA } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card } from '../ui/Card';
import { getUserFromToken } from '../../utils/jwt';

const TwoFactorSetup: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [setupStep, setSetupStep] = useState<'initial' | 'verify' | 'complete'>('initial');
  const [is2FAEnabled, setIs2FAEnabled] = useState(state.user?.isTwoFactorEnabled || false);

  // Make sure the 2FA state is in sync with the user context
  useEffect(() => {
    if (state.user) {
      setIs2FAEnabled(state.user.isTwoFactorEnabled);
    }
  }, [state.user]);

  const startSetup = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await enable2FA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
      setSetupStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };  const verifySetup = async () => {
    try {
      setLoading(true);
      setError('');
      await verify2FASetup(verificationCode);
      setSuccess('Two-factor authentication has been enabled successfully!');
      setSetupStep('complete');
      setIs2FAEnabled(true); // Update local state

      // Update the user in context with 2FA enabled
      if (state.user) {
        dispatch({
          type: 'SET_USER',
          payload: {
            ...state.user,
            isTwoFactorEnabled: true
          }
        });
      }

      // Also update the token in local storage with new user info
      const token = localStorage.getItem('token');
      if (token) {
        // The server would handle this normally, but we need to refresh the page
        // or update the context to reflect the new 2FA state
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };
  const disableTwoFactor = async () => {
    try {
      setLoading(true);
      setError('');
      await disable2FA();
      setSuccess('Two-factor authentication has been disabled successfully!');
      setQrCode(null);
      setSecret(null);
      setSetupStep('initial');
      setIs2FAEnabled(false); // Update local state

      // Update the user in context with 2FA disabled
      if (state.user) {
        dispatch({
          type: 'SET_USER',
          payload: {
            ...state.user,
            isTwoFactorEnabled: false
          }
        });
      }

      // Also update the token in local storage with new user info
      const token = localStorage.getItem('token');
      if (token) {
        // The server would handle this normally, but we need to refresh the page
        // or update the context to reflect the new 2FA state
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Two-Factor Authentication</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}      <Card className="bg-white p-6 rounded-lg shadow-md">
        {is2FAEnabled ? (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication is Enabled</h2>
              <p className="text-gray-600">Your account is currently protected with two-factor authentication.</p>
            </div>

            <Button
              onClick={disableTwoFactor}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Disable Two-Factor Authentication'}
            </Button>
          </div>
        ) : (
          <>
            {setupStep === 'initial' && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Enable Two-Factor Authentication</h2>
                <p className="text-gray-600 mb-6">
                  Two-factor authentication adds an extra layer of security to your account.
                  In addition to your password, you'll need to enter a code from your mobile
                  device when logging in.
                </p>

                <Button
                  onClick={startSetup}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Set up two-factor authentication'}
                </Button>
              </div>
            )}

            {setupStep === 'verify' && qrCode && secret && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>

                <div className="mb-6">
                  <p className="text-gray-600 mb-2">
                    Scan this QR code with your authenticator app:
                  </p>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="QR Code for 2FA" className="border p-2" />
                  </div>

                  <p className="text-gray-600 mb-2">
                    Or enter this code manually into your app:
                  </p>
                  <div className="bg-gray-100 p-2 rounded font-mono text-center mb-4">
                    {secret}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Enter the 6-digit verification code from your app:
                  </label>
                  <Input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6-digit code"
                    className="w-full"
                    maxLength={6}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setSetupStep('initial');
                      setQrCode(null);
                      setSecret(null);
                    }}
                    className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={verifySetup}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify and enable'}
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 'complete' && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Setup Complete!</h2>
                <p className="text-gray-600 mb-6">
                  Two-factor authentication has been enabled for your account.
                  You'll need to enter a verification code from your authenticator app
                  when logging in from now on.
                </p>
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
                  <p className="font-bold">Important:</p>
                  <p>If you lose access to your authenticator app, you won't be able to log in to your account.</p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default TwoFactorSetup;
