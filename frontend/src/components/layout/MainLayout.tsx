import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { Coffee, ShoppingBag, User, BarChart3, Package, LogOut, Droplet } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  // Redirect to cashier view if user is not an admin
  useEffect(() => {
    if (state.user && state.user.role === 'Cashier' && state.activeView === 'admin') {
      dispatch({ type: 'SET_VIEW', payload: 'cashier' });
    }
  }, [state.activeView, state.user, dispatch]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'SET_USER', payload: null });
    navigate('/login');
  };
  // Base nav items that are always shown (Cashier and Logout)
  const baseNavItems = [
    {
      label: 'Cashier',
      icon: <ShoppingBag size={20} />,
      isActive: state.activeView === 'cashier',
      onClick: () => dispatch({ type: 'SET_VIEW', payload: 'cashier' })
    },
    {
      label: 'Logout',
      icon: <LogOut size={20} />,
      isActive: false,
      onClick: handleLogout
    }
  ];

  // Create admin nav item only if user has Admin role
  const adminNavItem = state.user?.role === 'Admin' ? [
    {
      label: 'Admin',
      icon: <User size={20} />,
      isActive: state.activeView === 'admin',
      onClick: () => dispatch({ type: 'SET_VIEW', payload: 'admin' })
    }
  ] : [];

  // Combine the nav items
  const navItems = [
    ...baseNavItems.slice(0, 1), // Cashier
    ...adminNavItem,             // Admin (if authorized)
    ...baseNavItems.slice(1)     // Logout
  ];

  const adminNavItems = state.activeView === 'admin' ? [
    {
      label: 'Inventory',
      icon: <Package size={20} />,
      isActive: state.adminTab === 'inventory',
      onClick: () => dispatch({ type: 'SET_ADMIN_TAB', payload: 'inventory' })
    },
    {
      label: 'Financial',
      icon: <ShoppingBag size={20} />,
      isActive: state.adminTab === 'financial',
      onClick: () => dispatch({ type: 'SET_ADMIN_TAB', payload: 'financial' })
    },
    {
      label: 'Analytics',
      icon: <BarChart3 size={20} />,
      isActive: state.adminTab === 'analytics',
      onClick: () => dispatch({ type: 'SET_ADMIN_TAB', payload: 'analytics' })
    }, {
      label: 'Staff',
      icon: <User size={20} />,
      isActive: state.adminTab === 'staff',
      onClick: () => dispatch({ type: 'SET_ADMIN_TAB', payload: 'staff' })
    },

  ] : [];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">      <Navbar
      logo={<Coffee size={24} className="text-blue-600" />}
      appName="POS System"
      navItems={navItems}
    />

      <div className="flex-1 flex flex-col">
        {state.activeView === 'admin' && (
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4">
              <div className="flex space-x-4 overflow-x-auto py-2">
                {adminNavItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${item.isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>
      </div>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} POS System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;