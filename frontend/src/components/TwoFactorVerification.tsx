import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../services/api';
import Button from './ui/Button';
import Input from './ui/Input';
import { useAppContext } from '../context/AppContext';

const TwoFactorVerification: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useAppContext();

  // Get email and password from location state
  const { email, password } = location.state || {};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Missing login credentials. Please try logging in again.');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    } try {
      setLoading(true);
      const response = await login(email, password, code);

      // Store token and redirect
      localStorage.setItem('token', response.token);

      // Update app context with user data
      dispatch({
        type: 'SET_USER',
        payload: response.user
      });

      // Set initial view based on role
      if (response.user.role === 'Cashier') {
        dispatch({ type: 'SET_VIEW', payload: 'cashier' });
      } else {
        dispatch({ type: 'SET_VIEW', payload: 'admin' });
      }

      // Navigate to the main page
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold mb-4 text-center text-gray-800">Two-Factor Verification</h2>
          <p className="text-gray-600 mb-8 text-center">
            Enter the 6-digit code from your authenticator app to continue
          </p>

          <div className="mb-6">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <Input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center text-xl font-bold tracking-widest"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Back to login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
