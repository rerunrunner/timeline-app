import { useMemo, useRef } from 'react';
import type { IReveal } from '../../types/interfaces';
import {
  formatEpisodeTime,
  timelineDisplayName,
  type MobileTimelineModel,
} from './mobileModel';

interface EpisodeBrowserProps {
  model: MobileTimelineModel;
  selectedRevealId: string | null;
  onRevealSelect: (reveal: IReveal) => void;
}

function screenshotSource(reveal: IReveal): string | undefined {
  if (!reveal.screenshotFilename) return undefined;
  const editorApiUrl =
    (import.meta.env.VITE_EDITOR_API_URL as string | undefined) ??
    (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : '');
  if (!editorApiUrl) return `/images/screenshots/${reveal.screenshotFilename}`;
  return `${new URL(editorApiUrl).origin}/api/tables/reveal/${reveal.id}/image/${reveal.screenshotFilename}`;
}

export function EpisodeBrowser({
  model,
  selectedRevealId,
  onRevealSelect,
}: EpisodeBrowserProps) {
  const viewRef = useRef<HTMLElement>(null);
  const revealsByEpisode = useMemo(() => {
    const groups = new Map<string, IReveal[]>();
    for (const reveal of model.playbackReveals) {
      const episodeReveals = groups.get(reveal.episodeId) ?? [];
      episodeReveals.push(reveal);
      groups.set(reveal.episodeId, episodeReveals);
    }
    return groups;
  }, [model]);

  const jumpToEpisode = (episodeId: string) => {
    const section = viewRef.current?.querySelector<HTMLElement>(
      `[data-mobile-episode-id="${episodeId}"]`
    );
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="mobile-explorer-view mobile-episode-view"
      ref={viewRef}
      role="tabpanel"
      aria-labelledby="mobile-episodes-tab"
    >
      <div className="mobile-view-toolbar">
        <div className="mobile-view-toolbar-copy">
          <strong>Browse reveals by episode</strong>
          <span>
            {model.playbackReveals.length} reveals across {model.episodes.length} episodes
          </span>
        </div>
        <select
          className="mobile-filter-select"
          aria-label="Jump to an episode"
          defaultValue={model.episodes[0]?.id}
          onChange={event => jumpToEpisode(event.target.value)}
        >
          {model.episodes.map(episode => (
            <option value={episode.id} key={episode.id}>
              Episode {episode.episodeNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="mobile-episode-sections">
        {model.episodes.map(episode => {
          const reveals = revealsByEpisode.get(episode.id) ?? [];
          return (
            <section
              className="mobile-episode-section"
              data-mobile-episode-id={episode.id}
              key={episode.id}
            >
              <div className="mobile-episode-heading">
                <div>
                  <span>Episode {episode.episodeNumber}</span>
                  <h2>{episode.title}</h2>
                </div>
                <small>{reveals.length} reveals</small>
              </div>
              <div className="mobile-episode-events">
                {reveals.map(reveal => {
                  const imageSource = screenshotSource(reveal);
                  const timeline = reveal.event.eventGroup.subSegment.segment.timeline;
                  return (
                    <button
                      className={`mobile-episode-event${selectedRevealId === reveal.id ? ' is-selected' : ''}`}
                      type="button"
                      aria-pressed={selectedRevealId === reveal.id}
                      onClick={() => onRevealSelect(reveal)}
                      key={reveal.id}
                    >
                      {imageSource ? (
                        <img
                          loading="lazy"
                          src={imageSource}
                          alt=""
                        />
                      ) : (
                        <span className="mobile-event-image-placeholder" aria-hidden="true">
                          ⌁
                        </span>
                      )}
                      <span className="mobile-episode-event-copy">
                        <small>
                          {formatEpisodeTime(reveal.episodeTime)} ·{' '}
                          {reveal.narrativeTimeframe}
                        </small>
                        <strong>{reveal.title}</strong>
                        <span className="mobile-relationship-tag">
                          {reveal.event.eventType
                            ? reveal.event.eventType.replace('-', ' ')
                            : timelineDisplayName(timeline.name)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
