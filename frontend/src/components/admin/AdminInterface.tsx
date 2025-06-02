import React from 'react';
import { useAppContext } from '../../context/AppContext';
import InventoryManagement from './InventoryManagement';
import FinancialTracking from './FinancialTracking';
import AnalyticsDashboard from './AnalyticsDashboard';
import StaffManagement from './StaffManagement';
import ProfilePage from './ProfilePage';

const AdminInterface: React.FC = () => {
  const { state } = useAppContext();

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
      case 'profile':
        return <ProfilePage />;
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