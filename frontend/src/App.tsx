import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CashierInterface from './components/cashier/CashierInterface';
import AdminInterface from './components/admin/AdminInterface';
import LoginPage from './components/LoginPage';

const AppContent: React.FC = () => {
  const { state } = useAppContext();
  const isAuthenticated = !!localStorage.getItem('token');

  // Force rerender on login/logout
  useEffect(() => {
    // Listen for storage changes (e.g., login in another tab)
    const onStorage = () => window.location.reload();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout>
                {state.activeView === 'cashier' ? <CashierInterface /> : <AdminInterface />}
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