import React, { useState, useRef, useCallback, useEffect } from 'react';
import IEventViewer from './EventViewer';
import type { IEvent } from '../../../types/interfaces';
import type { Platform } from '../hooks/usePlatform';

interface ResizableEventViewerProps {
  event: IEvent | null;
  currentTime?: number;
  episodes?: Array<{ id: string; episodeNumber: number; title: string; duration: number }>;
  isLocked?: boolean;
  onToggleLock?: () => void;
  initialWidthPercent?: number;
  minWidthPercent?: number;
  maxWidthPercent?: number;
  platform: Platform;
  compactLandscape: boolean;
  visibility: 'hidden' | 'visible';
  onVisibilityChange: (visibility: 'hidden' | 'visible') => void;
  /** Fires when user opens the OST outbound link (PostHog). */
  onSoundtrackOutboundClick?: () => void;
}

const ResizableEventViewer: React.FC<ResizableEventViewerProps> = ({
  event,
  currentTime = 0,
  episodes = [],
  isLocked = false,
  onToggleLock,
  initialWidthPercent = 25,
  minWidthPercent = 10,
  maxWidthPercent = 50,
  platform,
  compactLandscape,
  visibility,
  onVisibilityChange,
  onSoundtrackOutboundClick,
}) => {
  const isNarrowLayout = !compactLandscape && platform !== 'computer';
  const [sizePercent, setSizePercent] = useState(() => {
    if (platform === 'mobile') return 44;
    if (platform === 'tablet') return 34;
    return initialWidthPercent;
  });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPointerRef = useRef<number>(0);
  const startSizePercentRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);
  const minWidthPercentRef = useRef(minWidthPercent);
  const maxWidthPercentRef = useRef(maxWidthPercent);
  const prevPlatformRef = useRef<Platform>(platform);
  const [sheetHeightPx, setSheetHeightPx] = useState(280);
  const sheetStartYRef = useRef(0);
  const sheetStartHeightRef = useRef(280);

  useEffect(() => {
    if (compactLandscape) return;
    if (platform === 'mobile') {
      minWidthPercentRef.current = Math.max(minWidthPercent, 20);
      maxWidthPercentRef.current = 80;
    } else if (platform === 'tablet') {
      minWidthPercentRef.current = Math.max(minWidthPercent, 20);
      maxWidthPercentRef.current = 80;
    } else {
      minWidthPercentRef.current = minWidthPercent;
      maxWidthPercentRef.current = maxWidthPercent;
    }
  }, [compactLandscape, minWidthPercent, maxWidthPercent, platform]);

  useEffect(() => {
    if (compactLandscape) return;
    if (prevPlatformRef.current === platform) return;
    prevPlatformRef.current = platform;
    if (platform === 'mobile') setSizePercent(44);
    else if (platform === 'tablet') setSizePercent(34);
    else setSizePercent(initialWidthPercent);
  }, [compactLandscape, platform, initialWidthPercent]);

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

  useEffect(() => {
    if (!compactLandscape || typeof window === 'undefined') return;
    const maxHeight = Math.max(window.innerHeight - 24, 200);
    setSheetHeightPx((current) => Math.min(current, maxHeight));
  }, [compactLandscape]);

  if (compactLandscape) {
    const clampSheetHeight = (height: number) => {
      if (typeof window === 'undefined') return height;
      const minHeight = Math.min(180, window.innerHeight * 0.35);
      const maxHeight = Math.max(window.innerHeight - 24, minHeight);
      return Math.max(minHeight, Math.min(maxHeight, height));
    };

    const handleSheetResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      activePointerIdRef.current = e.pointerId;
      sheetStartYRef.current = e.clientY;
      sheetStartHeightRef.current = sheetHeightPx;
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleSheetResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing || activePointerIdRef.current !== e.pointerId) return;
      const delta = sheetStartYRef.current - e.clientY;
      setSheetHeightPx(clampSheetHeight(sheetStartHeightRef.current + delta));
    };

    const handleSheetResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== e.pointerId) return;
      setIsResizing(false);
      activePointerIdRef.current = null;
    };

    return (
      <div className={`event-sheet event-sheet--${visibility}`}>
        {visibility === 'hidden' ? (
          <button
            type="button"
            className="event-sheet-show-button"
            onClick={() => onVisibilityChange('visible')}
          >
            Show
          </button>
        ) : (
          <div className="event-sheet-panel" style={{ height: `${sheetHeightPx}px` }}>
            <div
              className={`event-sheet-resize-bar${isResizing ? ' is-resizing' : ''}`}
              onPointerDown={handleSheetResizeStart}
              onPointerMove={handleSheetResizeMove}
              onPointerUp={handleSheetResizeEnd}
              onPointerCancel={handleSheetResizeEnd}
              role="separator"
              aria-orientation="horizontal"
            >
              <div className="event-sheet-grabber" />
              <button
                type="button"
                className="event-sheet-hide-button"
                onClick={() => onVisibilityChange('hidden')}
              >
                Hide
              </button>
            </div>
            <div className="event-sheet-content">
              <IEventViewer
                event={event}
                currentTime={currentTime}
                episodes={episodes}
                isLocked={isLocked}
                onToggleLock={onToggleLock}
                hideHeaderActions
                onSoundtrackOutboundClick={onSoundtrackOutboundClick}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

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
            hideHeaderActions={platform === 'mobile'}
            onSoundtrackOutboundClick={onSoundtrackOutboundClick}
          />
        </div>
      </div>
    </>
  );
};

export default ResizableEventViewer;
