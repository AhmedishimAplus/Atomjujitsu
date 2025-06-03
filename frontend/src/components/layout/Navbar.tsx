import React, { useEffect, useState } from 'react';
import { getTokenRemainingTime } from '../../utils/jwt';

interface NavItem {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

interface NavbarProps {
  logo: React.ReactNode;
  appName: string;
  navItems: NavItem[];
}

const Navbar: React.FC<NavbarProps> = ({ logo, appName, navItems }) => {
  // Separate logout item from navigation items
  const navigationItems = navItems.filter(item => item.label !== 'Logout');
  const logoutItem = navItems.find(item => item.label === 'Logout');

  // JWT Expiry Timer State
  const [remaining, setRemaining] = useState<{ hours: string; minutes: string; seconds: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setRemaining(null);
      return;
    }
    const update = () => {
      const time = getTokenRemainingTime(token);
      setRemaining(time);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format remaining time as HH:MM:SS
  const formatTime = (time: { hours: string; minutes: string; seconds: string } | null) => {
    if (!time) return '';
    if (time.hours === '00' && time.minutes === '00' && time.seconds === '00') return 'Expired';
    return `${time.hours}:${time.minutes}:${time.seconds}`;
  };

  // Show prompt if token is about to expire (less than 2 minutes)
  const showPrompt = remaining !== null && remaining.hours === '00' && parseInt(remaining.minutes) < 2 && (remaining.hours !== '00' || remaining.minutes !== '00' || remaining.seconds !== '00');

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              {logo}
              <span className="ml-2 text-xl font-bold text-gray-900">{appName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {remaining !== null && (
              <div className={`text-sm font-semibold px-3 py-1 rounded ${showPrompt ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`} title="Session expires soon">
                Session: {formatTime(remaining)}
              </div>
            )}
            <div className="hidden md:flex md:space-x-4">
              {navigationItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md transition-colors ${item.isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>
            {logoutItem && (
              <button
                onClick={logoutItem.onClick}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
              >
                {logoutItem.icon && <span className="mr-2">{logoutItem.icon}</span>}
                {logoutItem.label}
              </button>
            )}
          </div>
        </div>
        {showPrompt && (
          <div className="text-center text-red-700 bg-red-50 py-1 rounded mt-2 font-medium">
            Your session is about to expire. Please re-login to continue.
          </div>
        )}
      </div>

      {/* Mobile menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex space-x-2 overflow-x-auto px-4 py-2">
          {navigationItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md transition-colors flex-shrink-0 ${item.isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;