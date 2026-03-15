import React, { useState, useEffect, useRef } from 'react';
import MentionDropdown from './MentionDropdown';

interface Event {
  id: number;
  shortDescription: string;
  timelineId: string;
  narrativeDate: string;
}

interface RichTextEditorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  events?: Event[];
  onEventClick?: (eventId: number) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  events = [],
  onEventClick
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  // Parse mentions from plain text and convert to HTML with styled tokens
  const parseMentions = (text: string): string => {
    if (!text) return '';
    
    // Replace @event-{id} patterns with styled spans
    return text.replace(/@event-(\d+)/g, (_, eventId) => {
      const event = events.find(e => e.id === parseInt(eventId));
      const timelinePrefix = event?.timelineId ? `${event.timelineId}-` : 'tl1-';
      const displayText = event && event.shortDescription ? `＠${timelinePrefix}${event.shortDescription}` : `＠${timelinePrefix}event-${eventId}`;
      return `<span class="mention bg-blue-100 text-blue-700 px-1 py-0.5 rounded text-sm font-medium cursor-pointer hover:bg-blue-200 select-all" data-event-id="${eventId}" contenteditable="false" style="pointer-events: auto;">${displayText}</span>`;
    });
  };

  // Convert HTML content back to plain text for saving
  const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Convert mention spans back to @event-{id} format
    const mentionSpans = tempDiv.querySelectorAll('.mention');
    mentionSpans.forEach(span => {
      const eventId = span.getAttribute('data-event-id');
      if (eventId) {
        span.textContent = `@event-${eventId}`;
        span.removeAttribute('class');
        span.removeAttribute('data-event-id');
        span.removeAttribute('contenteditable');
      }
    });
    
    // Convert <p> tags to newlines by joining their text content
    const pTags = tempDiv.querySelectorAll('p');
    const lines: string[] = [];
    pTags.forEach(p => {
      const text = p.textContent || '';
      lines.push(text);
    });
    
    return lines.join('\n');
  };

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value || '');
    if (editorRef.current) {
      // Parse mentions and wrap content in <p> tags like Slack does
      const lines = (value || '').split('\n');
      const wrappedContent = lines.map(line => {
        const parsedLine = parseMentions(line);
        return line.trim() === '' ? '<p><br></p>' : `<p>${parsedLine}</p>`;
      }).join('');
      
      editorRef.current.innerHTML = wrappedContent;
    }
  }, [value, events]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newValue = e.currentTarget.innerText || '';
    setInternalValue(newValue);

    
    // Check for @ symbol to show mention dropdown
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if cursor is inside a mention span
      const mentionSpan = range.startContainer.parentElement?.closest('.mention');
      if (mentionSpan) {
        // Don't show dropdown if cursor is inside a mention token
        setShowMentionDropdown(false);
        return;
      }
      
      // Get the current paragraph where the cursor is located
      const currentP = range.startContainer.parentElement?.closest('p');
      if (!currentP) return;
      
      const pText = currentP.textContent || '';
      const pHTML = currentP.innerHTML;
      
      // Check if this paragraph contains a mention span
      const hasMentionSpan = pHTML.includes('class="mention"');
      
      // Only look for @ if this paragraph doesn't contain a mention span
      if (!hasMentionSpan && pText.includes('@')) {
        const atIndex = pText.lastIndexOf('@');
      
        if (atIndex !== -1) {
          const textAfterAt = pText.substring(atIndex + 1);
          const hasSpaceAfterAt = textAfterAt.includes(' ');
          
          if (!hasSpaceAfterAt) {
            
            // Calculate absolute position within entire editor
            const allParagraphs = editorRef.current?.querySelectorAll('p') || [];
            let absoluteIndex = 0;
            for (let i = 0; i < allParagraphs.length; i++) {
              if (allParagraphs[i] === currentP) {
                absoluteIndex += atIndex;
                break;
              }
              absoluteIndex += (allParagraphs[i].textContent?.length || 0) + 1; // +1 for newline
            }
            
            setMentionStartIndex(absoluteIndex);
            setMentionSearchTerm(textAfterAt);
            setShowMentionDropdown(true);
            setSelectedMentionIndex(0); // Reset selection to first item
          
          // Calculate dropdown position relative to the viewport
          const rangeRect = range.getBoundingClientRect();
          const position = {
            top: rangeRect.bottom + 5, // Position below cursor
            left: rangeRect.left
          };
          
          
          setMentionPosition(position);
          } else {
            setShowMentionDropdown(false);
          }
        } else {
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    }
  };

  const handleBlur = () => {
    if (editorRef.current) {
      // Convert HTML content back to plain text for saving
      const htmlContent = editorRef.current.innerHTML;
      const plainText = htmlToPlainText(htmlContent);
      const trimmedValue = plainText.trim();
      
      setInternalValue(trimmedValue);
      
      // Save as null if empty, otherwise save trimmed value
      onChange(trimmedValue === '' ? null : trimmedValue);
    }
    
    // Hide mention dropdown on blur
    setShowMentionDropdown(false);
  };

  // Handle mention selection from dropdown
  const handleMentionSelect = (event: Event) => {
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const currentP = range.startContainer.parentElement?.closest('p');
        
        if (currentP) {
          // Get the current paragraph text
          const pText = currentP.textContent || '';
          
          // Replace @searchTerm with @event-{id}
          const newPText = pText.replace(`@${mentionSearchTerm}`, `@event-${event.id}`);
          
          // Parse the new text to convert mentions to spans
          const parsedContent = parseMentions(newPText);
          
          // Update the paragraph content
          currentP.innerHTML = parsedContent;
          
          // Position cursor after the inserted mention
          const mentionSpan = currentP.querySelector(`[data-event-id="${event.id}"]`);
          if (mentionSpan) {
            const newRange = document.createRange();
            newRange.setStartAfter(mentionSpan);
            newRange.setEndAfter(mentionSpan);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    }
    
    setShowMentionDropdown(false);
    setMentionSearchTerm('');
    setMentionStartIndex(-1);
  };

  // Filter events for mention dropdown
  const filteredEvents = events.filter(event =>
    event.shortDescription && event.shortDescription.toLowerCase().includes(mentionSearchTerm.toLowerCase())
  );

  // Hide dropdown if no filtered events
  useEffect(() => {
    if (showMentionDropdown && filteredEvents.length === 0) {
      setShowMentionDropdown(false);
    }
  }, [filteredEvents.length, showMentionDropdown]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMentionDropdown && filteredEvents.length > 0) {
      // Handle dropdown navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredEvents.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredEvents.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedEvent = filteredEvents[selectedMentionIndex];
        if (selectedEvent) {
          handleMentionSelect(selectedEvent);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionDropdown(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Revert to original value using <p> tags with token parsing
      setInternalValue(value || '');
      if (editorRef.current) {
        const lines = (value || '').split('\n');
        const wrappedContent = lines.map(line => {
          const parsedLine = parseMentions(line);
          return line.trim() === '' ? '<p><br></p>' : `<p>${parsedLine}</p>`;
        }).join('');
        editorRef.current.innerHTML = wrappedContent;
      }
      // Blur the editor to exit edit mode
      editorRef.current?.blur();
    }
    // Let the browser handle Enter naturally - it will create new <p> tags
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains('mention')) {
      const eventId = target.getAttribute('data-event-id');
      
      if (eventId && onEventClick) {
        e.preventDefault();
        e.stopPropagation();
        onEventClick(parseInt(eventId));
      }
    }
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onClick={handleClick}
        className={`w-full text-sm bg-transparent border border-gray-300 rounded p-2 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap break-words ${className}`}
      />
      
      {!internalValue && (
        <div className="absolute top-2 left-2 text-gray-400 pointer-events-none whitespace-pre-wrap">
          {placeholder}
        </div>
      )}
      
      {/* Mention Dropdown */}
      <MentionDropdown
        isVisible={showMentionDropdown}
        events={filteredEvents}
        selectedIndex={selectedMentionIndex}
        position={mentionPosition}
        onSelect={handleMentionSelect}
      />
    </div>
  );
};

export default RichTextEditor;