import React from 'react';
import { Input, TextArea, Select } from './';

interface CardFieldProps {
  label: string;
  value: string | number | null;
  type?: 'text' | 'textarea' | 'select' | 'number';
  options?: Array<{ value: string | number; label: string }>;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
  customComponent?: React.ReactNode;
}

export const CardField: React.FC<CardFieldProps> = ({
  label,
  value,
  type = 'text',
  options = [],
  onChange,
  placeholder,
  className = '',
  disabled = false,
  title,
  customComponent
}) => {
  const handleFieldUpdate = (newValue: string | number) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className={`card-editor-field ${className}`}>
      <label>{label}</label>
      <div onClick={(e) => e.stopPropagation()}>
        {customComponent ? (
          customComponent
        ) : type === 'select' ? (
          <Select
            value={value}
            onChange={handleFieldUpdate}
            options={options}
            placeholder="None"
            disabled={disabled}
            title={title}
          />
        ) : type === 'textarea' ? (
          <TextArea
            value={value?.toString() || ''}
            onChange={(value) => handleFieldUpdate(value)}
            placeholder={placeholder}
            disabled={disabled}
            title={title}
          />
        ) : (
          <Input
            value={value?.toString() || ''}
            onChange={(value) => handleFieldUpdate(value)}
            placeholder={placeholder}
            disabled={disabled}
            title={title}
          />
        )}
      </div>
    </div>
  );
};
