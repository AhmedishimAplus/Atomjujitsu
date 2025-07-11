import React from 'react';
import { useAppContext } from '../../context/AppContext';
import InventoryManagement from './InventoryManagement';
import FinancialTracking from './FinancialTracking';
import AnalyticsDashboard from './AnalyticsDashboard';
import StaffManagement from './StaffManagement';
import TwoFactorSetup from './TwoFactorSetup';
import { Navigate } from 'react-router-dom';

const AdminInterface: React.FC = () => {
  const { state, dispatch } = useAppContext();

  // Redirect non-admin users
  if (state.user?.role !== 'Admin') {
    dispatch({ type: 'SET_VIEW', payload: 'cashier' });
    return <Navigate to="/" replace />;
  }

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (state.adminTab) {
      case 'inventory':
        return <InventoryManagement />;
      case 'financial':
        return <FinancialTracking />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'staff':
        return <StaffManagement />;
      case '2fa':
        return <TwoFactorSetup />;
      case 'users':
        return <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-6">User Management</h1>
          <p className="text-lg">This feature has been temporarily removed and will be reimplemented soon.</p>
        </div>;
      default:
        return <InventoryManagement />;
    }
  };

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
};

export default AdminInterface;