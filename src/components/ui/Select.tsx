import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  label?: string;
  error?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

const Select: React.FC<SelectProps> = ({
  id,
  options,
  label,
  error,
  fullWidth = false,
  value,
  onChange,
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
  
  const widthClass = fullWidth ? 'w-full' : '';
  const errorClass = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };
  
  return (
    <div className={`${widthClass}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`appearance-none block ${widthClass} px-3 py-2 border ${errorClass} rounded-md shadow-sm bg-white focus:outline-none focus:ring-2 sm:text-sm ${className}`}
        value={value}
        onChange={handleChange}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;