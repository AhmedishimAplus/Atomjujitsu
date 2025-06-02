import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import CashierInterface from './components/cashier/CashierInterface';
import AdminInterface from './components/admin/AdminInterface';
import Login from './components/auth/Login'; // Import the Login component

const AppContent: React.FC = () => {
  const { state, login, clearAuthError } = useAppContext(); // Get auth state and login function

  // Clear auth error when Login component is not shown or on unmount
  // This is to prevent showing old error messages if the user navigates away
  // or if the auth state changes for other reasons.
  React.useEffect(() => {
    if (state.auth.isAuthenticated && state.auth.error) {
      // If user becomes authenticated and there was an error, clear it.
      // The `clearAuthError` function should be available from context.
      // If `clearAuthError` is not added to context yet, this will need adjustment.
      // For now, let's assume it will be added or handle it directly with dispatch.
      // dispatch({ type: 'CLEAR_AUTH_ERROR' }); // Alternative if clearAuthError not in context
    }
    // Cleanup function to clear error when component unmounts or before re-render if needed
    return () => {
      // Example: if you want to clear error when navigating away from login view
      // This depends on how navigation/view changes are structured.
      // For now, a simple check on auth status change might be enough.
    };
  }, [state.auth.isAuthenticated, state.auth.error]);


  if (!state.auth.isAuthenticated) {
    return (
      <Login 
        handleLogin={login} 
        errorMessage={state.auth.error || undefined} 
        isLoading={state.auth.isLoading} 
      />
    );
  }

  // If authenticated, show the main application content
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