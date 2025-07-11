import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CashierInterface from './components/cashier/CashierInterface';
import AdminInterface from './components/admin/AdminInterface';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import TwoFactorVerification from './components/TwoFactorVerification';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import EmailVerifiedPendingApproval from './components/EmailVerifiedPendingApproval';
import { getUserFromToken } from './utils/jwt';

const AppContent: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;
  // Load user data from token on startup
  useEffect(() => {
    if (token) {
      const userData = getUserFromToken(token);
      if (userData) {
        dispatch({
          type: 'SET_USER',
          payload: {
            ...userData,
            name: userData.name || userData.email.split('@')[0], // Use email username as name for display if name is missing
            isTwoFactorEnabled: Boolean(userData.isTwoFactorEnabled), // Make sure it's a boolean
            isEmailVerified: Boolean(userData.isEmailVerified) // Make sure it's a boolean
          }
        });

        // Set initial view based on role
        if (userData.role === 'Cashier') {
          dispatch({ type: 'SET_VIEW', payload: 'cashier' });
        }
      }
    }
  }, [token, dispatch]);

  // Force rerender on login/logout
  useEffect(() => {
    // Listen for storage changes (e.g., login in another tab)
    const onStorage = () => window.location.reload();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Determine if user can access admin interface
  const canAccessAdmin = state.user?.role === 'Admin';

  // If user tries to access admin view but doesn't have permission, show cashier view
  const currentView = state.activeView === 'admin' && !canAccessAdmin ? 'cashier' : state.activeView;
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-2fa" element={<TwoFactorVerification />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/email-verified-pending-approval" element={<EmailVerifiedPendingApproval />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout>
                {currentView === 'cashier' ? <CashierInterface /> : <AdminInterface />}
              </MainLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;