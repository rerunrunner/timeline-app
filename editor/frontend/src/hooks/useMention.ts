import { useState, useRef, useCallback } from 'react';

interface Event {
  id: string;
  shortDescription: string;
  timelineId: string;
}

interface MentionState {
  isVisible: boolean;
  position: { top: number; left: number };
  searchTerm: string;
  startIndex: number;
  endIndex: number;
}

export const useMention = (events: Event[]) => {
  const [mentionState, setMentionState] = useState<MentionState>({
    isVisible: false,
    position: { top: 0, left: 0 },
    searchTerm: '',
    startIndex: 0,
    endIndex: 0
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getCaretPosition = useCallback(() => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Create a temporary div to measure text position
    const div = document.createElement('div');
    const style = getComputedStyle(textarea);
    
    // Copy textarea styles to div
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.font = style.font;
    div.style.fontSize = style.fontSize;
    div.style.fontFamily = style.fontFamily;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.width = style.width;
    
    // Get text up to cursor position
    const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
    div.textContent = textBeforeCursor;
    
    document.body.appendChild(div);
    
    // Get the position of the last character
    const span = document.createElement('span');
    span.textContent = textarea.value.substring(textarea.selectionStart - 1, textarea.selectionStart);
    div.appendChild(span);
    
    const spanRect = span.getBoundingClientRect();
    document.body.removeChild(div);
    
    return {
      top: spanRect.bottom - rect.top + 5,
      left: spanRect.left - rect.left
    };
  }, []);

  const handleTextChange = useCallback((value: string, cursorPosition: number) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // Check if there's a space or newline after @
      const textAfterAt = textBeforeCursor.substring(atIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      
      if (!hasSpaceAfterAt) {
        const searchTerm = textAfterAt;
        const position = getCaretPosition();
        
        setMentionState({
          isVisible: true,
          position,
          searchTerm,
          startIndex: atIndex,
          endIndex: cursorPosition
        });
        return;
      }
    }
    
    // Hide mention dropdown if visible
    if (mentionState.isVisible) {
      setMentionState(prev => ({ ...prev, isVisible: false }));
    }
  }, [mentionState.isVisible, getCaretPosition]);

  const handleMentionSelect = useCallback((event: Event) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const value = textarea.value;
    const mentionText = `@${event.timelineId}-${event.shortDescription}`;
    
    // Replace the @searchTerm with the full mention
    const newValue = 
      value.substring(0, mentionState.startIndex) +
      mentionText +
      value.substring(mentionState.endIndex);
    
    // Update the textarea value
    textarea.value = newValue;
    
    // Set cursor position after the mention
    const newCursorPosition = mentionState.startIndex + mentionText.length;
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    
    // Hide the dropdown
    setMentionState(prev => ({ ...prev, isVisible: false }));
    
    // Trigger onChange event
    const event_obj = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event_obj);
  }, [mentionState]);

  const handleMentionClose = useCallback(() => {
    setMentionState(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    textareaRef,
    mentionState,
    handleTextChange,
    handleMentionSelect,
    handleMentionClose
  };
};
