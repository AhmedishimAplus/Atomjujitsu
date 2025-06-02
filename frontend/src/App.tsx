import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import CashierInterface from './components/cashier/CashierInterface';
import AdminInterface from './components/admin/AdminInterface';
import LoginPage from './components/auth/LoginPage';

const AppContent: React.FC = () => {
  const { state } = useAppContext();
  const { state: authState } = useAuth();

  // If not authenticated, show login page
  if (!authState.isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <MainLayout>
      {state.activeView === 'cashier' ? <CashierInterface /> : <AdminInterface />}
    </MainLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;