import React from 'react';
import { useAppContext } from '../../context/AppContext';
import InventoryManagement from './InventoryManagement';
import FinancialTracking from './FinancialTracking';
import AnalyticsDashboard from './AnalyticsDashboard';
import StaffManagement from './StaffManagement';
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