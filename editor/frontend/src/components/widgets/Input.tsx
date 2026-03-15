import React, { useRef, useEffect, useState } from 'react';

interface InputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  editing?: boolean;
  onEditStart?: () => void;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  autoFocus = false,
  onKeyDown,
  onBlur,
  editing = false,
  onEditStart
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(editing);
  const [internalValue, setInternalValue] = useState(value?.toString() || '');

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  useEffect(() => {
    setIsEditing(editing);
  }, [editing]);

  useEffect(() => {
    setInternalValue(value?.toString() || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  };

  const handleClick = () => {
    if (!disabled && !isEditing) {
      setIsEditing(true);
      onEditStart?.();
      // Focus the input immediately after state update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    } else if (isEditing && inputRef.current && !disabled) {
      // If already editing, focus the input
      inputRef.current.focus();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(internalValue); // Only call onChange when finishing edit
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      onChange(internalValue); // Save changes
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setInternalValue(value?.toString() || ''); // Revert to original value
    }
    onKeyDown?.(e);
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    // Only handle Enter and Space when NOT editing (to enter edit mode)
    if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
    onKeyDown?.(e);
  };

  return (
    <div 
      className={`input-container ${className} ${disabled ? 'disabled' : ''}`} 
      onClick={disabled ? undefined : handleClick}
      onKeyDown={handleContainerKeyDown}
      tabIndex={disabled ? -1 : 0}
      style={{ 
        cursor: 'default',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {isEditing && !disabled ? (
        <input
          ref={inputRef}
          type="text"
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
        />
      ) : (
        <span 
          style={{ color: disabled ? '#6b7280' : 'inherit' }}
          data-placeholder={!value?.toString() ? 'true' : 'false'}
        >
          {value?.toString() || placeholder || (disabled ? '' : 'Click to edit...')}
        </span>
      )}
    </div>
  );
};
