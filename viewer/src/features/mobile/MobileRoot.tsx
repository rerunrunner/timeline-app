import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import type { IEvent, IReveal } from '../../types/interfaces';
import type { MobileRootProps } from './contract';
import { EpisodeBrowser } from './EpisodeBrowser';
import { EventDetailSheet } from './EventDetailSheet';
import { TimelineMap } from './TimelineMap';
import {
  buildMobileTimelineModel,
  findRevealAtPlaybackTime,
} from './mobileModel';
import './mobile.css';

type MobileView = 'map' | 'episodes';

export default function MobileRoot({
  timelines,
  currentTime,
  hasTimeDeepLink,
  onTimeChange,
  episodes = [],
  availableLanguages,
  selectedLanguageCode,
  onLanguageChange,
  isLoadingDatasets,
  hasDatasets,
}: MobileRootProps) {
  const model = useMemo(
    () => buildMobileTimelineModel(timelines, episodes),
    [timelines, episodes]
  );
  const [activeView, setActiveView] = useState<MobileView>('map');
  const [selectedTimelineId, setSelectedTimelineId] = useState('all');
  const [selectedRevealId, setSelectedRevealId] = useState<string | null>(
    () =>
      (hasTimeDeepLink
        ? findRevealAtPlaybackTime(model, currentTime)
        : model.narrativeReveals[0]
      )?.id ?? null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [landscapeDetailWidth, setLandscapeDetailWidth] = useState(0);
  const siteMenuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeMenuOnOutsidePointer = (event: PointerEvent) => {
      const menu = siteMenuRef.current;
      if (
        menu?.open &&
        event.target instanceof Node &&
        !menu.contains(event.target)
      ) {
        menu.open = false;
      }
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      const menu = siteMenuRef.current;
      if (event.key !== 'Escape' || !menu?.open) return;
      menu.open = false;
      menu.querySelector<HTMLElement>('summary')?.focus();
    };
    document.addEventListener('pointerdown', closeMenuOnOutsidePointer);
    document.addEventListener('keydown', closeMenuOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenuOnOutsidePointer);
      document.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, []);

  const updateLandscapeDetailWidth = useCallback((width: number) => {
    const roundedWidth = Math.round(width);
    setLandscapeDetailWidth(current =>
      current === roundedWidth ? current : roundedWidth
    );
  }, []);

  useEffect(() => {
    const currentSelection = selectedRevealId
      ? model.revealById.get(selectedRevealId)
      : undefined;
    if (currentSelection) return;
    setSelectedRevealId(
      (hasTimeDeepLink
        ? findRevealAtPlaybackTime(model, currentTime)
        : model.narrativeReveals[0]
      )?.id ?? null
    );
  }, [currentTime, hasTimeDeepLink, model, selectedRevealId]);

  const selectReveal = useCallback(
    (reveal: IReveal) => {
      setSelectedRevealId(reveal.id);
      setDetailOpen(true);
      onTimeChange(reveal.playtimeTimestamp);
    },
    [onTimeChange]
  );

  const selectEvent = useCallback(
    (event: IEvent) => {
      const reveal = event.reveals.at(-1);
      if (reveal) selectReveal(reveal);
    },
    [selectReveal]
  );

  const selectedReveal = selectedRevealId
    ? model.revealById.get(selectedRevealId)
    : undefined;

  if (isLoadingDatasets) {
    return (
      <main className="mobile-explorer mobile-explorer-state">
        Loading the timeline…
      </main>
    );
  }

  if (!hasDatasets || model.events.length === 0) {
    return (
      <main className="mobile-explorer mobile-explorer-state">
        No timeline dataset is available.
      </main>
    );
  }

  return (
    <main
      className="mobile-explorer"
      style={
        {
          '--landscape-detail-visible-width': `${landscapeDetailWidth}px`,
        } as CSSProperties
      }
    >
      <header className="mobile-explorer-header">
        <div className="mobile-explorer-topline">
          <a
            className="mobile-brand-lockup"
            href="/"
            target="_top"
            aria-label="Runner Unwound timeline"
          >
            <img
              className="mobile-brand-mark"
              src="/assets/images/favicon.svg"
              alt=""
            />
            <div className="mobile-brand-copy">
              <span className="mobile-brand-name">Runner Unwound</span>
              <div className="mobile-brand-subtitle">
                <span className="mobile-brand-tagline">Full-series explorer</span>
              </div>
            </div>
          </a>
          <div className="mobile-header-actions">
            {availableLanguages.length > 1 && (
              <label className="mobile-language-picker">
                <span className="sr-only">Language</span>
                <select
                  aria-label="Language"
                  value={selectedLanguageCode}
                  onChange={event => onLanguageChange(event.target.value)}
                >
                  {availableLanguages.map(language => (
                    <option value={language.code} key={language.code}>
                      {language.flagEmoji ? `${language.flagEmoji} ` : ''}
                      {language.localizedName ?? language.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <details className="mobile-site-menu" ref={siteMenuRef}>
              <summary aria-label="Site menu">
                <span aria-hidden="true" />
              </summary>
              <nav aria-label="Site pages">
                <a href="/" target="_top" aria-current="page">Timeline</a>
                <a href="/thoughts/" target="_top">Thoughts</a>
                <a href="/about.html" target="_top">About</a>
              </nav>
            </details>
          </div>
        </div>
        <div className="mobile-view-switcher" role="tablist" aria-label="Choose an exploration view">
          <button
            className={activeView === 'map' ? 'is-active' : ''}
            id="mobile-map-tab"
            type="button"
            role="tab"
            aria-selected={activeView === 'map'}
            aria-controls="mobile-map-panel"
            onClick={() => setActiveView('map')}
          >
            Timeline map
          </button>
          <button
            className={activeView === 'episodes' ? 'is-active' : ''}
            id="mobile-episodes-tab"
            type="button"
            role="tab"
            aria-selected={activeView === 'episodes'}
            aria-controls="mobile-episodes-panel"
            onClick={() => setActiveView('episodes')}
          >
            By episode
          </button>
        </div>
      </header>

      <div className="mobile-explorer-stage">
        <div id="mobile-map-panel" hidden={activeView !== 'map'}>
          <TimelineMap
            model={model}
            selectedRevealId={selectedRevealId}
            selectedTimelineId={selectedTimelineId}
            onTimelineChange={setSelectedTimelineId}
            onEventSelect={selectEvent}
          />
        </div>
        <div id="mobile-episodes-panel" hidden={activeView !== 'episodes'}>
          <EpisodeBrowser
            model={model}
            selectedRevealId={selectedRevealId}
            onRevealSelect={selectReveal}
          />
        </div>

        {selectedReveal && (
          <EventDetailSheet
            model={model}
            selectedReveal={selectedReveal}
            selectedTimelineId={selectedTimelineId}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onLandscapeVisibleWidthChange={updateLandscapeDetailWidth}
            onRevealSelect={selectReveal}
          />
        )}
      </div>
    </main>
  );
}
