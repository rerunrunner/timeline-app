import React, { useRef, useEffect, useState } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: () => void;
  onEditStart?: () => void;
  editing?: boolean;
  rows?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  autoFocus = false,
  onKeyDown,
  onBlur,
  onEditStart,
  editing = false,
  rows = 8
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(editing);
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    setIsEditing(editing);
  }, [editing]);

  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
  };

  const handleClick = () => {
    if (!isEditing && !disabled) {
      setIsEditing(true);
      onEditStart?.();
      // Focus the textarea immediately after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    } else if (isEditing && textareaRef.current && !disabled) {
      // If already editing, focus the textarea
      textareaRef.current.focus();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(internalValue); // Only call onChange when finishing edit
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      // Ctrl+Enter to save and exit edit mode
      e.preventDefault();
      setIsEditing(false);
      onChange(internalValue); // Save changes
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setInternalValue(value || ''); // Revert to original value
    }
    onKeyDown?.(e);
  };

  return (
    <div 
      className={`input-container textarea ${className} ${disabled ? 'disabled' : ''}`} 
      onClick={disabled ? undefined : handleClick}
      style={{ 
        cursor: 'default',
        opacity: disabled ? 0.6 : 1
      }}
    >
      <textarea
        ref={textareaRef}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={!isEditing || disabled}
        className="input-widget"
        placeholder={placeholder}
        rows={rows}
        style={{ 
          cursor: disabled ? 'default' : (isEditing ? 'text' : 'default'),
          resize: disabled ? 'none' : (isEditing ? 'vertical' : 'none'),
          color: disabled ? '#6b7280' : 'inherit'
        }}
      />
    </div>
  );
};
