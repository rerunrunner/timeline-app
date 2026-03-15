import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MentionDropdown from './MentionDropdown';

interface Event {
  id: string;
  shortDescription: string;
  timelineId: string;
}

interface MentionTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  events: Event[];
}

const MentionTextArea: React.FC<MentionTextAreaProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  rows = 3,
  events
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(0);
  const [mentionEndIndex, setMentionEndIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Update internal value when external value changes
  React.useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const getCaretPosition = () => {
    if (!textareaRef.current) return { top: 100, left: 100 };
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    const dropdownHeight = 200;
    const dropdownWidth = 200;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate absolute position relative to viewport
    let top = rect.bottom + 5; // Default: below textarea
    let left = rect.left; // Align to left edge of textarea
    
    // If dropdown would go below viewport, position it above textarea
    if (top + dropdownHeight > viewportHeight) {
      top = rect.top - dropdownHeight - 5;
    }
    
    // If dropdown would go off right edge, adjust left position
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 10;
    }
    
    // Ensure left doesn't go negative
    if (left < 0) {
      left = 10;
    }
    
    
    return { top, left };
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    setInternalValue(newValue); // Only update internal state
    
    // Check for @ mention
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    
    if (atIndex !== -1) {
      // Check if there's a space or newline after @
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      
      
      if (!hasSpaceAfterAt) {
        const searchTerm = textAfterAt;
        const position = getCaretPosition();
        
        
        setIsVisible(true);
        setPosition(position);
        setSearchTerm(searchTerm);
        setMentionStartIndex(atIndex);
        setMentionEndIndex(cursorPosition);
        setSelectedIndex(0);
        return;
      }
    }
    
    // Hide mention dropdown if visible
    if (isVisible) {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    // Always allow immediate editing - no need to click to enter edit mode
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(internalValue); // Only call onChange when finishing edit
    setIsVisible(false); // Hide mention dropdown
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isVisible) {
      // Handle mention dropdown navigation
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredEvents.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredEvents.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (filteredEvents[selectedIndex]) {
            handleMentionSelect(filteredEvents[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsVisible(false);
          break;
      }
    } else {
      // Handle normal editing
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
    }
  };

  const handleMentionSelect = (event: Event) => {
    if (!textareaRef.current) return;
    
    const mentionText = `@${event.timelineId}-${event.shortDescription}`;
    
    // Replace the @searchTerm with the full mention
    const newValue = 
      internalValue.substring(0, mentionStartIndex) +
      mentionText +
      internalValue.substring(mentionEndIndex);
    
    setInternalValue(newValue);
    
    // Hide the dropdown
    setIsVisible(false);
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = mentionStartIndex + mentionText.length;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleMentionClose = () => {
    setIsVisible(false);
  };

  // Filter events based on search term
  const filteredEvents = events.filter(event =>
    event.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.timelineId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      className="relative"
    >
      <textarea
        ref={textareaRef}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full text-sm bg-transparent border border-gray-300 rounded p-2 resize-none ${className}`}
        rows={rows}
        readOnly={false}
        style={{
          cursor: 'text',
          resize: 'vertical'
        }}
      />
      
      {isVisible && createPortal(
        <MentionDropdown
          isVisible={isVisible}
          position={position}
          searchTerm={searchTerm}
          events={filteredEvents}
          onSelect={handleMentionSelect}
          onClose={handleMentionClose}
        />,
        document.body
      )}
    </div>
  );
};

export default MentionTextArea;
