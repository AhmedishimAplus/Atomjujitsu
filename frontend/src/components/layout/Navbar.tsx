import React from 'react';

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
          
          <div className="flex items-center">
            <div className="hidden md:ml-6 md:flex md:space-x-4">
              {navItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md transition-colors ${
                    item.isActive
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
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex space-x-2 overflow-x-auto px-4 py-2">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                item.isActive
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
    </nav>
  );
};

export default Navbar;