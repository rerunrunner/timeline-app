import React, { useState, useRef, useEffect } from 'react';

interface DurationEditorProps {
  value: number; // Duration in seconds
  onSave: (value: number) => Promise<void>;
  onCancel?: () => void;
}

const DurationEditor: React.FC<DurationEditorProps> = ({
  value,
  onSave,
  onCancel
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const parseDuration = (durationString: string): number => {
    if (!durationString.trim()) return 0;
    
    const trimmed = durationString.trim();
    
    // Single regex to match all valid duration formats
    const durationRegex = /^\d{1,3}(?::\d{1,2}(?::\d{1,2})?)?$/;
    
    if (!durationRegex.test(trimmed)) {
      throw new Error('Invalid duration format. Use: seconds (90), mm:ss (23:45), or h:mm:ss (1:23:45)');
    }
    
    const parts = trimmed.split(':').map(Number);
    
    if (parts.length === 1) {
      // Just seconds: "90"
      const seconds = parts[0];
      if (seconds < 0) throw new Error('Duration cannot be negative');
      return seconds;
    } else if (parts.length === 2) {
      // Minutes:seconds: "23:45"
      const [minutes, seconds] = parts;
      if (minutes < 0 || seconds < 0) throw new Error('Duration cannot be negative');
      if (seconds >= 60) throw new Error('Seconds must be less than 60');
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // Hours:minutes:seconds: "1:23:45"
      const [hours, minutes, seconds] = parts;
      if (hours < 0 || minutes < 0 || seconds < 0) throw new Error('Duration cannot be negative');
      if (minutes >= 60 || seconds >= 60) throw new Error('Minutes and seconds must be less than 60');
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    throw new Error('Invalid duration format');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow digits, colons, and spaces (for formatting)
    // Remove any other characters
    const filtered = value.replace(/[^\d:\s]/g, '');
    
    // Clean up multiple spaces and normalize
    const normalized = filtered.replace(/\s+/g, ' ').trim();
    
    setEditValue(normalized);
  };

  const handleClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setEditValue(formatDuration(value));
      setHasError(false);
    }
  };

  const handleSave = async () => {
    try {
      setHasError(false);
      
      const seconds = parseDuration(editValue);
      
      // Additional validation: ensure the result is valid
      if (isNaN(seconds) || seconds < 0) {
        throw new Error('Invalid duration format');
      }
      
      await onSave(seconds);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save duration:', error);
      // Show error state and revert to original value
      setHasError(true);
      setEditValue(formatDuration(value));
      // Don't exit edit mode so user can fix the input
      
      // Clear error state after a short delay
      setTimeout(() => setHasError(false), 2000);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Only save on blur if the value has changed
    if (editValue !== formatDuration(value)) {
      handleSave();
    } else {
      handleCancel();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <td className="inline-editable-cell editing">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="mm:ss or h:mm:ss"
          title="Press Enter to save, Esc to cancel"
          style={{
            color: hasError ? '#dc2626' : 'inherit'
          }}
        />
      </td>
    );
  }

  return (
    <td className="inline-editable-cell">
      <span
        onClick={handleClick}
        className="truncated-text"
        title="Click to edit duration (Enter to save, Esc to cancel)"
      >
        {formatDuration(value)}
      </span>
    </td>
  );
};

export default DurationEditor;
