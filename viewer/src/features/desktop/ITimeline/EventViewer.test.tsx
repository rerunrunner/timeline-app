import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IEvent, IReveal } from '../../../types/interfaces';
import IEventViewer from './EventViewer';

function eventWithReveals(): IEvent {
  const eventRecord: Record<string, unknown> = {
    id: 'event-1',
    narrativeTimestamp: new Date('2022-05-01T00:00:00Z'),
    tags: [],
    narrativeTransitions: [],
    correlatedEvents: [],
    getNarrativeState: () => 'canonical',
    getTitle: () => '',
    getDescription: () => '',
    getNarrativeTimeframe: () => '',
    getScreenshotFilename: () => null,
  };
  const event = eventRecord as unknown as IEvent;
  const reveal = (
    id: string,
    playtimeTimestamp: number,
    title: string,
    screenshotFilename: string
  ): IReveal => ({
    id,
    title,
    description: `${title} description`,
    episodeId: 'episode-1',
    episodeTime: playtimeTimestamp,
    playtimeTimestamp,
    narrativeTimeframe: 'May 2022',
    narrativeTimeframeSpecificityLevel: 7,
    screenshotFilename,
    event,
  });

  eventRecord.reveals = [
    reveal('reveal-1', 10, 'First reveal', 'first.jpg'),
    reveal('reveal-2', 20, 'Second reveal', 'second.jpg'),
    reveal('reveal-3', 30, 'Future reveal', 'future.jpg'),
  ];
  eventRecord.eventGroup = {
    events: [event],
    subSegment: {
      segment: {
        timeline: { name: 'Original timeline' },
      },
    },
  };
  return event;
}

describe('IEventViewer reached reveals', () => {
  it('lets the user browse reached images without exposing future reveals', () => {
    render(
      <IEventViewer
        event={eventWithReveals()}
        currentTime={20}
        episodes={[
          { id: 'episode-1', episodeNumber: 1, title: 'Episode 1', duration: 60 },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Second reveal' })).toBeInTheDocument();
    expect(screen.queryByText('Future reveal')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Show reached reveal/ })
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole('button', { name: 'Show reached reveal 1 of 2' })
    );

    expect(screen.getByRole('heading', { name: 'First reveal' })).toBeInTheDocument();
    expect(screen.getByText('First reveal description')).toBeInTheDocument();
    expect(screen.queryByText('Future reveal description')).not.toBeInTheDocument();
  });
});
