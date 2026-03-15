import React, { useEffect, useRef } from 'react';

interface Event {
  id: number;
  shortDescription: string;
  timelineId: string;
  narrativeDate: string;
}

interface MentionDropdownProps {
  isVisible: boolean;
  events: Event[];
  selectedIndex: number;
  position: { top: number; left: number };
  onSelect: (event: Event) => void;
}

const MentionDropdown: React.FC<MentionDropdownProps> = ({
  isVisible,
  events,
  selectedIndex,
  position,
  onSelect
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (isVisible && dropdownRef.current) {
      const selectedItem = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isVisible]);

  if (!isVisible || events.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto z-50 min-w-[200px]"
      style={{
        top: position.top,
        left: position.left
      }}
    >
      {events.map((event, index) => (
        <div
          key={event.id}
          className={`px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${
            index === selectedIndex ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(event)}
        >
          <div className="font-medium text-sm">@{event.shortDescription || 'Unknown Event'}</div>
          <div className="text-xs text-gray-500">
            {event.timelineId || 'Unknown Timeline'} • {event.narrativeDate || 'Unknown Date'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MentionDropdown;