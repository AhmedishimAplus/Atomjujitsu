import React from 'react';

interface ToggleProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  disabled = false
}) => {
  const toggleId = `toggle-${Math.random().toString(36).substring(2, 9)}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };
  
  return (
    <div className="flex items-center">
      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-600"
          style={{
            transition: 'all 0.3s ease',
            top: '0px',
            outline: 'none'
          }}
        />
        <label
          htmlFor={toggleId}
          className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
            checked ? 'bg-blue-600' : 'bg-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ transition: 'background-color 0.3s ease' }}
        ></label>
      </div>
      {label && (
        <label
          htmlFor={toggleId}
          className={`text-sm font-medium ${
            disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Toggle;