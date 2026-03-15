import React, { useRef, useEffect } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number | null;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  title?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = '',
  autoFocus = false,
  onKeyDown,
  onBlur,
  title
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (autoFocus && selectRef.current) {
      selectRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const convertedValue = newValue === '' ? null : (typeof options[0]?.value === 'number' ? Number(newValue) : newValue);
    onChange(convertedValue);
  };

  return (
    <div className={`input-container ${className}`}>
      <select
        ref={selectRef}
        value={value?.toString() || ''}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        disabled={disabled}
        className="input-widget"
        title={title}
      >
        <option value="">{placeholder || 'None'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
