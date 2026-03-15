import React, { useState, useRef, useCallback, useEffect } from 'react';
import IEventViewer from './EventViewer';
import type { IEvent } from '../../types/interfaces';

interface ResizableEventViewerProps {
  event: IEvent | null;
  currentTime?: number;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  isLocked?: boolean;
  initialWidthPercent?: number;
  minWidthPercent?: number;
  maxWidthPercent?: number;
}

const ResizableEventViewer: React.FC<ResizableEventViewerProps> = ({
  event,
  currentTime = 0,
  episodes = [],
  isLocked = false,
  initialWidthPercent = 25,
  minWidthPercent = 10,
  maxWidthPercent = 50
}) => {
  const [widthPercent, setWidthPercent] = useState(initialWidthPercent);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthPercentRef = useRef<number>(0);
  const minWidthPercentRef = useRef(minWidthPercent);
  const maxWidthPercentRef = useRef(maxWidthPercent);

  // Update refs when props change
  useEffect(() => {
    minWidthPercentRef.current = minWidthPercent;
    maxWidthPercentRef.current = maxWidthPercent;
  }, [minWidthPercent, maxWidthPercent]);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.parentElement?.offsetWidth || 1000;
    const deltaX = startXRef.current - e.clientX; // Inverted because we're dragging from the left edge
    const deltaPercent = (deltaX / containerWidth) * 100;
    const newWidthPercent = Math.max(
      minWidthPercentRef.current, 
      Math.min(maxWidthPercentRef.current, startWidthPercentRef.current + deltaPercent)
    );
    setWidthPercent(newWidthPercent);
  }, []);

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    
    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthPercentRef.current = widthPercent;
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [widthPercent, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <>
      {/* Resize handle - positioned between timeline and event viewer */}
      <div 
        className={`resize-handle-between ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="resize-handle-line"></div>
      </div>
      
      {/* Event viewer */}
      <div 
        ref={containerRef}
        className="resizable-event-viewer"
        style={{ width: `${widthPercent}%` }}
      >
        <div className="event-viewer-content">
          <IEventViewer
            event={event}
            currentTime={currentTime}
            episodes={episodes}
            isLocked={isLocked}
          />
        </div>
      </div>
    </>
  );
};

export default ResizableEventViewer;
