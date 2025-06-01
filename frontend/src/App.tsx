import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import CashierInterface from './components/cashier/CashierInterface';
import AdminInterface from './components/admin/AdminInterface';

const AppContent: React.FC = () => {
  const { state } = useAppContext();
  
  return (
    <MainLayout>
      {state.activeView === 'cashier' ? <CashierInterface /> : <AdminInterface />}
    </MainLayout>
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