import React, { useState, useRef, useEffect } from 'react';

interface InlineEditableCellProps {
  value: any;
  column: {
    name: string;
    type: string;
    not_null: boolean;
    primary_key: boolean;
  };
  recordId: string | number;
  onSave: (columnName: string, value: any, recordId: string | number) => Promise<void>;
}

const InlineEditableCell: React.FC<InlineEditableCellProps> = ({
  value,
  column,
  recordId,
  onSave
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!column.primary_key) {
      setIsEditing(true);
      setEditValue(String(value || ''));
    }
  };

  const handleSave = async () => {
    if (editValue === String(value || '')) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(column.name, editValue, recordId);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Revert on error
      setEditValue(String(value || ''));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(String(value || ''));
    setIsEditing(false);
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
    // Only save on blur if not already saving
    if (!isSaving) {
      handleSave();
    }
  };

  // Don't make primary key fields editable
  if (column.primary_key) {
    return (
      <td className="inline-editable-cell primary-key">
        {value === null ? (
          <span className="null-value">null</span>
        ) : (
          <span className="truncated-text" title={String(value)}>
            {String(value)}
          </span>
        )}
      </td>
    );
  }

  if (isEditing) {
    return (
      <td className="inline-editable-cell editing">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          title="Press Enter to save, Esc to cancel"
        />
      </td>
    );
  }

  return (
    <td 
      className="inline-editable-cell"
      onClick={handleClick}
      title="Click to edit"
    >
      {value === null ? (
        <span className="null-value">null</span>
      ) : typeof value === 'string' && value.length > 50 ? (
        <span title={value} className="truncated-text">
          {value.substring(0, 50)}...
        </span>
      ) : (
        <span className="truncated-text" title={String(value)}>
          {String(value)}
        </span>
      )}
    </td>
  );
};

export default InlineEditableCell;
