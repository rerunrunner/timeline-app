import React, { useState, useRef, useCallback, useEffect } from 'react';
import IEventViewer from './EventViewer';
import type { IEvent } from '../../types/interfaces';

interface ResizableEventViewerProps {
  event: IEvent | null;
  currentTime?: number;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  isLocked?: boolean;
  onToggleLock?: () => void;
  initialWidthPercent?: number;
  minWidthPercent?: number;
  maxWidthPercent?: number;
}

const ResizableEventViewer: React.FC<ResizableEventViewerProps> = ({
  event,
  currentTime = 0,
  episodes = [],
  isLocked = false,
  onToggleLock,
  initialWidthPercent = 25,
  minWidthPercent = 10,
  maxWidthPercent = 50
}) => {
  const [sizePercent, setSizePercent] = useState(initialWidthPercent);
  const [isResizing, setIsResizing] = useState(false);
  const [isNarrowLayout, setIsNarrowLayout] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const startPointerRef = useRef<number>(0);
  const startSizePercentRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const minWidthPercentRef = useRef(minWidthPercent);
  const maxWidthPercentRef = useRef(maxWidthPercent);

  // Update refs when props change
  useEffect(() => {
    minWidthPercentRef.current = minWidthPercent;
    maxWidthPercentRef.current = maxWidthPercent;
  }, [minWidthPercent, maxWidthPercent]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleLayoutChange = (event: MediaQueryListEvent) => {
      setIsNarrowLayout(event.matches);
    };

    setIsNarrowLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleLayoutChange);

    return () => {
      mediaQuery.removeEventListener('change', handleLayoutChange);
    };
  }, []);

  // Handle pointer move during resize
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (!isResizing || activePointerIdRef.current !== e.pointerId) return;

    const parentSize = isNarrowLayout
      ? containerRef.current.parentElement?.offsetHeight || 1000
      : containerRef.current.parentElement?.offsetWidth || 1000;
    const delta = isNarrowLayout
      ? startPointerRef.current - e.clientY
      : startPointerRef.current - e.clientX;
    const deltaPercent = (delta / parentSize) * 100;
    const newSizePercent = Math.max(
      minWidthPercentRef.current, 
      Math.min(maxWidthPercentRef.current, startSizePercentRef.current + deltaPercent)
    );
    setSizePercent(newSizePercent);
  }, [isNarrowLayout, isResizing]);

  // Handle pointer up to end resize
  const stopResizing = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && activePointerIdRef.current !== pointerId) return;

    setIsResizing(false);
    activePointerIdRef.current = null;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    stopResizing(e.pointerId);
  }, [stopResizing]);

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    stopResizing(e.pointerId);
  }, [stopResizing]);

  // Handle pointer down on resize handle
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    activePointerIdRef.current = e.pointerId;
    startPointerRef.current = isNarrowLayout ? e.clientY : e.clientX;
    startSizePercentRef.current = sizePercent;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [isNarrowLayout, sizePercent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopResizing();
    };
  }, [stopResizing]);

  return (
    <>
      {/* Resize handle - positioned between timeline and event viewer */}
      <div 
        className={`resize-handle-between ${isResizing ? 'resizing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        role="separator"
        aria-orientation={isNarrowLayout ? 'horizontal' : 'vertical'}
      >
        <div className="resize-handle-line"></div>
      </div>
      
      {/* Event viewer */}
      <div 
        ref={containerRef}
        className="resizable-event-viewer"
        style={isNarrowLayout ? { height: `${sizePercent}%` } : { width: `${sizePercent}%` }}
      >
        <div className="event-viewer-content">
          <IEventViewer
            event={event}
            currentTime={currentTime}
            episodes={episodes}
            isLocked={isLocked}
            onToggleLock={onToggleLock}
          />
        </div>
      </div>
    </>
  );
};

export default ResizableEventViewer;
