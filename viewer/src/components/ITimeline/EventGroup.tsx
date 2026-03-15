import React, { useState, useCallback } from 'react';
import type { IEventGroup, IEvent } from '../../types/interfaces';
import { NarrativeStatus } from '../../types/timeline';

/**
 * EventGroup - Component for rendering multiple events that occur on the same day
 * 
 * This component represents a group of events that happen on the same date within
 * a timeline. It shows a single marker with the title of the most recently revealed
 * event, and expands on hover to show all events in the group.
 * 
 * Key responsibilities:
 * - Renders a single marker for multiple events on the same day
 * - Shows the title of the most recently revealed event
 * - Expands on hover to show all events in the group
 * - Handles click and hover interactions for individual events
 * - Manages expanded/collapsed state with CSS transitions
 */
interface EventGroupProps {
  eventGroup: IEventGroup;
  currentTime: number;
  onEventClick: (event: IEvent) => void;
  onEventHover: (event: IEvent) => void;
  onEventHoverEnd: () => void;
  lockedEvent: IEvent | null;
  activeEvent: IEvent | null;
  position: number; // Percentage position within the subsegment
}



export default function EventGroup({
  eventGroup,
  currentTime,
  onEventClick,
  onEventHover,
  onEventHoverEnd,
  lockedEvent,
  activeEvent,
  position
}: EventGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const narrativeStatus = eventGroup.getNarrativeState(currentTime);
  
  const isVisible = narrativeStatus !== NarrativeStatus.NOT_REACHED;
  const visibleEvents = eventGroup.events.filter(event => 
    event.getNarrativeState(currentTime) !== NarrativeStatus.NOT_REACHED
  );
  
  // Helper function to get the most specific displayed date from visible reveals
  const getMostSpecificDisplayedDate = useCallback(() => {
    const visibleReveals = visibleEvents.flatMap(event => 
      event.reveals.filter(reveal => 
        reveal.playtimeTimestamp <= currentTime
      )
    );
    
    if (visibleReveals.length === 0) {
      // Fallback to first event's narrative timestamp
      return eventGroup.events[0].narrativeTimestamp.toLocaleDateString();
    }
    
    // Find the reveal with the highest specificity level
    // Specificity levels: 0=future/unknown, 1=decade, 2=partial decade, 3=year, 4=partial year, 5=season, 6=partial season, 7=month, 8=partial month, 9=day
    // If multiple reveals have the same specificity, use the last one encountered
    let mostSpecificReveal = visibleReveals[0];
    let highestSpecificity = mostSpecificReveal.narrativeTimeframeSpecificityLevel;
    
    for (const reveal of visibleReveals) {
      // Use >= to prefer the last reveal when specificities are equal
      if (reveal.narrativeTimeframeSpecificityLevel >= highestSpecificity) {
        mostSpecificReveal = reveal;
        highestSpecificity = reveal.narrativeTimeframeSpecificityLevel;
      }
    }
    
    return mostSpecificReveal.narrativeTimeframe;
  }, [visibleEvents, currentTime, eventGroup.events]);
  
  // Check if any event in the group is locked or active
  const isLocked = lockedEvent && eventGroup.events.some(event => event.id === lockedEvent.id);
  const isActive = activeEvent && eventGroup.events.some(event => event.id === activeEvent.id);
  
  // Check for synchronized timeslip pairs
  const hasSynchronizedTimeslip = eventGroup.events.some(event => {
    // Check if this event is a timeslip event
    if (event.eventType === 'timeslip-out' || event.eventType === 'timeslip-in') {
      // Check if the active event is a timeslip event
      if (activeEvent && (activeEvent.eventType === 'timeslip-out' || activeEvent.eventType === 'timeslip-in')) {
        // Use the correlatedEvents property
        return activeEvent.correlatedEvents?.some(correlatedEvent => correlatedEvent.id === event.id) || false;
      }
    }
    return false;
  });
  
  // Determine aura classes based on event state
  const auraClass = isLocked ? 'aura-locked' : (isActive || hasSynchronizedTimeslip) ? 'aura-active' : '';
  
  // Determine narrative status for the event group container
  const groupNarrativeStatus = eventGroup.getNarrativeState(currentTime);
  const narrativeClass = groupNarrativeStatus === NarrativeStatus.CANONICAL ? 'canonical' : 
                        groupNarrativeStatus === NarrativeStatus.ERASED ? 'erased' : 'not-reached';
  
  // Handle group hover
  const handleGroupMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!isLocked) {
      setIsExpanded(true);
      // Show the primary event in the event viewer when hovering over the group
      if (visibleEvents.length > 0) {
        onEventHover(eventGroup.primaryEvent);
      }
    }
  }, [isLocked, visibleEvents, onEventHover, eventGroup.primaryEvent]);
  
  const handleGroupMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isLocked) {
      setIsExpanded(false);
      // Only clear the event viewer when leaving the entire group
      onEventHoverEnd();
    }
  }, [isLocked, onEventHoverEnd]);
  
  // Handle group click (lock the primary event)
  const handleGroupClick = useCallback(() => {
    onEventClick(eventGroup.primaryEvent);
  }, [onEventClick, eventGroup.primaryEvent]);
  
  // Handle individual event interactions
  const handleEventClick = useCallback((event: IEvent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent group click
    onEventClick(event);
  }, [onEventClick]);
  
  const handleEventHover = useCallback((event: IEvent) => {
    onEventHover(event);
  }, [onEventHover]);
  
  
  return (
    <div
      className={`i-event-group-container ${auraClass} ${narrativeClass}`}
      style={{ left: `${position}%` }}
      data-event-group-id={eventGroup.id}
      onMouseEnter={handleGroupMouseEnter}
      onMouseLeave={handleGroupMouseLeave}
      onClick={handleGroupClick}
    >
      {/* Main marker */}
      <div className="event-group-marker">
        <div className="marker-dot" />
      </div>
      
      {/* Expanded card - always visible */}
      <div className="event-group-expanded">
        <div 
          className="expanded-header"
          onMouseEnter={() => {
            if (visibleEvents.length > 0) {
              onEventHover(eventGroup.primaryEvent);
            }
          }}
        >
          <span className="date">{getMostSpecificDisplayedDate()}</span>
          <span className="event-count">{visibleEvents.length} events</span>
        </div>
        
        <div className="expanded-events">
          {visibleEvents.map((event) => {
            const eventIsLocked = lockedEvent?.id === event.id;
            const eventIsActive = activeEvent?.id === event.id;
            
            // Check for synchronized timeslip pairs for individual events
            const eventHasSynchronizedTimeslip = (event.eventType === 'timeslip-out' || event.eventType === 'timeslip-in') &&
              activeEvent && (activeEvent.eventType === 'timeslip-out' || activeEvent.eventType === 'timeslip-in') &&
              activeEvent.correlatedEvents?.some(correlatedEvent => correlatedEvent.id === event.id) || false;
            
            const eventAuraClass = eventIsLocked ? 'aura-locked' : (eventIsActive || eventHasSynchronizedTimeslip) ? 'aura-active' : '';
            
            // Get narrative status for CSS classes
            const eventNarrativeStatus = event.getNarrativeState(currentTime);
            const statusClass = eventNarrativeStatus === NarrativeStatus.CANONICAL ? 'canonical' : 
                              eventNarrativeStatus === NarrativeStatus.ERASED ? 'erased' : 'not-reached';
            
            // Check if this is the primary event
            const isPrimary = event.id === eventGroup.primaryEvent.id;
            
            return (
              <div
                key={event.id}
                className={`expanded-event ${eventAuraClass} ${statusClass} ${isPrimary ? 'latest' : ''}`}
                onClick={(e) => handleEventClick(event, e)}
                onMouseEnter={() => handleEventHover(event)}
                onMouseLeave={() => {
                  // Only clear if we're leaving the entire expanded area
                  // This prevents clearing when moving between header and events
                }}
              >
                <div className="event-title">
                  {event.getTitle(currentTime) || `Event ${event.id}`}
                </div>
                {eventIsLocked && (
                  <div className="locked-indicator">🔒</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 