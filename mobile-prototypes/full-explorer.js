const DATASET_URL = "../viewer/public/dataset.json";
const IMAGE_BASE = "../../runner-data/images/";
const TIMELINE_COLORS = ["#62c8ff", "#f0bd64", "#ed7890", "#9a8cff", "#67d2a0"];

const state = {
  dataset: null,
  episodes: [],
  timelines: [],
  events: [],
  reveals: [],
  eventById: new Map(),
  revealById: new Map(),
  episodeById: new Map(),
  timelineById: new Map(),
  branchByTimelineId: new Map(),
  soundtrackById: new Map(),
  timelineColorById: new Map(),
  selectedRevealId: null,
  activeView: "map",
  mapWidth: 0,
};

const sheet = document.querySelector("#detail-sheet");
const toast = document.querySelector("#toast");
const mapView = document.querySelector("#map-view");
const episodesView = document.querySelector("#episodes-view");
const mapCanvas = document.querySelector("#map-canvas");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function humanizeSlug(value) {
  return String(value ?? "Untitled event")
    .replace(/^tl\d+-/, "")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNarrativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "Date unknown");
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatEpisodeTime(value) {
  const totalSeconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function normalizeDataset(dataset) {
  state.dataset = dataset;
  state.episodes = [...(dataset.episodes ?? [])].sort(
    (left, right) => left.episodeNumber - right.episodeNumber
  );
  state.timelines = [...(dataset.timelines ?? [])];
  state.episodeById = new Map(state.episodes.map((episode) => [String(episode.id), episode]));
  state.timelineById = new Map(state.timelines.map((timeline) => [String(timeline.id), timeline]));
  state.soundtrackById = new Map(
    (dataset.soundtracks ?? []).map((soundtrack) => [String(soundtrack.id), soundtrack])
  );
  state.timelineColorById = new Map(
    state.timelines.map((timeline, index) => [
      String(timeline.id),
      TIMELINE_COLORS[index % TIMELINE_COLORS.length],
    ])
  );
  const timelineOrderById = new Map(
    state.timelines.map((timeline, index) => [String(timeline.id), index])
  );

  state.events = (dataset.events ?? [])
    .map((rawEvent) => {
      let currentTitle = humanizeSlug(rawEvent.shortDescription);
      let currentDate = formatNarrativeDate(rawEvent.narrativeDate);
      let currentDescription = "";
      let currentScreenshot = null;

      const event = {
        ...rawEvent,
        id: String(rawEvent.id),
        timelineId: String(rawEvent.timelineId),
        narrativeTime: new Date(rawEvent.narrativeDate).getTime(),
        reveals: [],
      };

      event.reveals = [...(rawEvent.reveals ?? [])]
        .sort((left, right) => left.absolutePlayTime - right.absolutePlayTime)
        .map((rawReveal) => {
          if (rawReveal.displayedTitle?.trim()) currentTitle = rawReveal.displayedTitle.trim();
          if (rawReveal.displayedDate?.trim()) currentDate = rawReveal.displayedDate.trim();
          if (rawReveal.displayedDescription?.trim()) {
            currentDescription = rawReveal.displayedDescription.trim();
          }
          if (rawReveal.screenshotFilename?.trim()) {
            currentScreenshot = rawReveal.screenshotFilename.trim();
          }
          return {
            ...rawReveal,
            id: String(rawReveal.id),
            eventId: event.id,
            episodeId: String(rawReveal.episodeId),
            effectiveTitle: currentTitle,
            effectiveDate: currentDate,
            effectiveDescription: currentDescription || "No description has been added yet.",
            effectiveScreenshot: currentScreenshot,
            event,
          };
        });

      event.displayReveal = event.reveals.at(-1) ?? {
        effectiveTitle: currentTitle,
        effectiveDate: currentDate,
        effectiveDescription: currentDescription || "No description has been added yet.",
        effectiveScreenshot: currentScreenshot,
        episodeId: "",
        episodeTime: 0,
      };
      return event;
    })
    .sort(
      (left, right) =>
        (timelineOrderById.get(left.timelineId) ?? Number.MAX_SAFE_INTEGER) -
          (timelineOrderById.get(right.timelineId) ?? Number.MAX_SAFE_INTEGER) ||
        left.narrativeTime - right.narrativeTime
    );

  state.eventById = new Map(state.events.map((event) => [event.id, event]));
  state.branchByTimelineId = new Map(
    state.timelines.flatMap((timeline) => {
      const entry = state.events
        .filter(
          (event) =>
            event.timelineId === String(timeline.id) &&
            event.eventType === "timeslip-in" &&
            event.linkedEventId
        )
        .sort((left, right) => left.narrativeTime - right.narrativeTime)
        .find((event) => {
          const linked = state.eventById.get(String(event.linkedEventId));
          return linked && linked.timelineId !== event.timelineId;
        });
      if (!entry) return [];
      return [
        [
          String(timeline.id),
          {
            entry,
            parent: state.eventById.get(String(entry.linkedEventId)),
          },
        ],
      ];
    })
  );
  state.reveals = state.events
    .flatMap((event) => event.reveals)
    .sort((left, right) => left.absolutePlayTime - right.absolutePlayTime);
  state.revealById = new Map(state.reveals.map((reveal) => [reveal.id, reveal]));
}

function timelineName(timelineId) {
  const name = state.timelineById.get(String(timelineId))?.name ?? "Unknown timeline";
  return name
    .replace(/\s+-\s+/, " · ")
    .replace(/Highschool(\d+)/gi, "High School $1");
}

function timelineShortName(timelineId) {
  return timelineName(timelineId).split(" · ")[0];
}

function episodeName(episodeId) {
  const episode = state.episodeById.get(String(episodeId));
  return episode ? `Episode ${episode.episodeNumber}` : "Episode unknown";
}

function imageMarkup(reveal, alt = "") {
  if (!reveal?.effectiveScreenshot) {
    return '<span class="event-image-placeholder" aria-hidden="true">⌁</span>';
  }
  return `<img loading="lazy" src="${escapeHtml(IMAGE_BASE + reveal.effectiveScreenshot)}" alt="${escapeHtml(alt)}" />`;
}

function setupSelectors() {
  const mapFilter = document.querySelector("#map-filter");
  const timelineSelect = document.createElement("select");
  timelineSelect.className = "filter-button";
  timelineSelect.id = "timeline-select";
  timelineSelect.setAttribute("aria-label", "Filter the map by timeline");
  timelineSelect.innerHTML = [
    '<option value="all">All timelines</option>',
    ...state.timelines.map(
      (timeline) =>
        `<option value="${escapeHtml(timeline.id)}">${escapeHtml(timelineShortName(timeline.id))}</option>`
    ),
  ].join("");
  mapFilter.replaceWith(timelineSelect);

  const episodeJump = document.querySelector("#episode-jump");
  const episodeSelect = document.createElement("select");
  episodeSelect.className = "filter-button";
  episodeSelect.id = "episode-select";
  episodeSelect.setAttribute("aria-label", "Jump to an episode");
  episodeSelect.innerHTML = state.episodes
    .map(
      (episode) =>
        `<option value="${escapeHtml(episode.id)}">Episode ${episode.episodeNumber}</option>`
    )
    .join("");
  episodeJump.replaceWith(episodeSelect);

  timelineSelect.addEventListener("change", () => {
    renderMap();
    renderDetail();
  });
  episodeSelect.addEventListener("change", () => {
    document
      .querySelector(`#episode-${CSS.escape(episodeSelect.value)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function canonicalContext(timelineId) {
  if (timelineId === "all") {
    return {
      activeEventIds: new Set(state.events.map((event) => event.id)),
      erasedEventIds: new Set(),
      ancestorTimelineIds: new Set(),
      activeBranchTimelineIds: new Set(state.branchByTimelineId.keys()),
    };
  }

  const activeEventIds = new Set(
    state.events
      .filter((event) => event.timelineId === timelineId)
      .map((event) => event.id)
  );
  const erasedEventIds = new Set();
  const ancestorTimelineIds = new Set();
  const activeBranchTimelineIds = new Set();
  let childTimelineId = timelineId;
  let cutoff = Number.POSITIVE_INFINITY;

  while (state.branchByTimelineId.has(childTimelineId)) {
    const branch = state.branchByTimelineId.get(childTimelineId);
    cutoff = Math.min(cutoff, branch.entry.narrativeTime);
    ancestorTimelineIds.add(branch.parent.timelineId);
    activeBranchTimelineIds.add(childTimelineId);
    state.events
      .filter((event) => event.timelineId === branch.parent.timelineId)
      .forEach((event) => {
        if (event.narrativeTime <= cutoff) {
          activeEventIds.add(event.id);
        }
      });
    childTimelineId = branch.parent.timelineId;
  }

  state.events.forEach((event) => {
    if (!activeEventIds.has(event.id)) erasedEventIds.add(event.id);
  });

  return {
    activeEventIds,
    erasedEventIds,
    ancestorTimelineIds,
    activeBranchTimelineIds,
  };
}

function renderMap() {
  const timelineId = document.querySelector("#timeline-select")?.value ?? "all";
  const selectedEventId = state.revealById.get(state.selectedRevealId)?.eventId;
  const canon = canonicalContext(timelineId);
  const mapWidth = mapView.clientWidth || 375;
  const mapSidePadding = Math.min(44, Math.max(28, mapWidth * 0.09));
  state.mapWidth = mapWidth;
  const timelineIndexById = new Map(
    state.timelines.map((timeline, index) => [String(timeline.id), index])
  );
  const laneX = state.timelines.map(
    (_, index) =>
      mapSidePadding +
      index *
        ((mapWidth - mapSidePadding * 2) / Math.max(1, state.timelines.length - 1))
  );

  document.querySelector("#map-view .view-toolbar-copy strong").textContent =
    timelineId === "all"
      ? "Timelines in story order"
      : timelineShortName(timelineId);
  const ownEventCount =
    timelineId === "all"
      ? state.events.length
      : state.events.filter((event) => event.timelineId === timelineId).length;
  const inheritedEventCount = canon.activeEventIds.size - ownEventCount;
  document.querySelector("#map-view .view-toolbar-copy span").textContent =
    timelineId === "all"
      ? `${state.events.length} events · all 5 paths at a glance`
      : `${ownEventCount} on this path · ${inheritedEventCount} inherited · ${canon.erasedEventIds.size} erased`;

  const groupsByDate = new Map();
  for (const event of state.events) {
    const dateKey = String(event.narrativeDate).slice(0, 10);
    if (!groupsByDate.has(dateKey)) groupsByDate.set(dateKey, []);
    groupsByDate.get(dateKey).push(event);
  }
  const groups = [...groupsByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dateKey, events]) => ({ dateKey, events }));

  let cursorY = 116;
  const eventPositions = new Map();
  for (const group of groups) {
    const eventsByTimeline = new Map();
    for (const event of group.events) {
      if (!eventsByTimeline.has(event.timelineId)) eventsByTimeline.set(event.timelineId, []);
      eventsByTimeline.get(event.timelineId).push(event);
    }
    const maxStack = Math.max(...[...eventsByTimeline.values()].map((events) => events.length));
    group.top = cursorY;
    group.height = Math.max(74, 42 + maxStack * 38);
    group.timelineCount = eventsByTimeline.size;
    for (const [groupTimelineId, events] of eventsByTimeline) {
      const timelineIndex = timelineIndexById.get(groupTimelineId) ?? 0;
      events.forEach((event, index) => {
        eventPositions.set(event.id, {
          x: laneX[timelineIndex],
          y: group.top + 40 + index * 38,
          timelineIndex,
          parallel: group.timelineCount > 1,
        });
      });
    }
    cursorY += group.height;
  }
  const mapHeight = cursorY + 150;

  function wavyPath(x, timelineIndex) {
    const top = 92;
    const bottom = mapHeight - 70;
    const segmentHeight = 360;
    let y = top;
    let direction = timelineIndex % 2 === 0 ? 1 : -1;
    let path = `M ${x} ${top}`;
    while (y < bottom) {
      const nextY = Math.min(y + segmentHeight, bottom);
      const distance = nextY - y;
      const amplitude = 5 + timelineIndex * 0.7;
      path += ` C ${x + amplitude * direction} ${y + distance * 0.32}, ${x - amplitude * direction} ${y + distance * 0.68}, ${x} ${nextY}`;
      direction *= -1;
      y = nextY;
    }
    return path;
  }

  const pathMarkup = state.timelines
    .map((timeline, index) => {
      const pathTimelineId = String(timeline.id);
      const color = state.timelineColorById.get(String(timeline.id));
      const ancestor = canon.ancestorTimelineIds.has(pathTimelineId);
      const muted =
        timelineId !== "all" && timelineId !== pathTimelineId && !ancestor;
      return `
        <path
          class="curve-path${ancestor ? " is-ancestor" : ""}${muted ? " is-muted" : ""}"
          style="--timeline-color: ${escapeHtml(color)}"
          d="${wavyPath(laneX[index], index)}"
        />
      `;
    })
    .join("");

  const jumpMarkup = state.events
    .filter((event) => event.eventType === "timeslip-out" && event.linkedEventId)
    .map((departure) => {
      const arrival = state.eventById.get(String(departure.linkedEventId));
      const departurePosition = eventPositions.get(departure.id);
      const arrivalPosition = eventPositions.get(arrival?.id);
      if (!arrival || !departurePosition || !arrivalPosition) return "";

      const sameLane = departure.timelineId === arrival.timelineId;
      const laneGap =
        (mapWidth - mapSidePadding * 2) / Math.max(1, state.timelines.length - 1);
      const bendDirection = departurePosition.timelineIndex % 2 === 0 ? 1 : -1;
      const bendX = sameLane
        ? departurePosition.x + bendDirection * Math.min(28, laneGap * 0.34)
        : (departurePosition.x + arrivalPosition.x) / 2;
      const verticalDirection =
        arrivalPosition.y < departurePosition.y ? -1 : 1;
      const turnRadius = Math.min(
        90,
        Math.max(40, Math.abs(arrivalPosition.y - departurePosition.y) * 0.08)
      );
      const color = state.timelineColorById.get(arrival.timelineId);
      const muted =
        timelineId !== "all" && !canon.activeEventIds.has(arrival.id);
      return `
        <path
          class="curve-jump${muted ? " is-muted" : ""}"
          style="--timeline-color: ${escapeHtml(color)}"
          data-jump-from="${escapeHtml(departure.id)}"
          data-jump-to="${escapeHtml(arrival.id)}"
          d="M ${departurePosition.x} ${departurePosition.y} C ${bendX} ${departurePosition.y + verticalDirection * turnRadius}, ${bendX} ${arrivalPosition.y - verticalDirection * turnRadius}, ${arrivalPosition.x} ${arrivalPosition.y}"
        />
      `;
    })
    .join("");

  let previousYear = null;
  const markerMarkup = groups
    .map((group) => {
      const year = group.dateKey.slice(0, 4);
      const markers = [];
      if (year !== previousYear) {
        markers.push(
          `<div class="curve-year-marker" style="top:${group.top + 5}px">${escapeHtml(year)}</div>`
        );
        previousYear = year;
      }
      if (group.timelineCount > 1) {
        markers.push(
          `<div class="curve-parallel-marker" style="top:${group.top + 24}px">${escapeHtml(formatNarrativeDate(group.dateKey))} · parallel</div>`
        );
      }
      return markers.join("");
    })
    .join("");

  const nodeMarkup = state.events
    .map((event) => {
      const position = eventPositions.get(event.id);
      const reveal = event.displayReveal;
      const color = state.timelineColorById.get(event.timelineId) ?? TIMELINE_COLORS[0];
      const selected = selectedEventId === event.id;
      const inherited =
        timelineId !== "all" &&
        event.timelineId !== timelineId &&
        canon.activeEventIds.has(event.id);
      const erased = canon.erasedEventIds.has(event.id);
      const filteredOut = !canon.activeEventIds.has(event.id) && !erased;
      const edgeClass =
        position.timelineIndex === 0
          ? " edge-left"
          : position.timelineIndex === state.timelines.length - 1
            ? " edge-right"
            : "";
      return `
      <button
        class="curve-event-node${event.eventType ? " is-timeslip" : ""}${position.parallel ? " is-parallel" : ""}${selected ? " is-selected" : ""}${inherited ? " is-inherited" : ""}${erased ? " is-erased" : ""}${filteredOut ? " is-filtered-out" : ""}${edgeClass}"
        type="button"
        data-event-id="${escapeHtml(event.id)}"
        data-timeline-id="${escapeHtml(event.timelineId)}"
        style="--timeline-color:${escapeHtml(color)};left:${position.x}px;top:${position.y}px"
        aria-label="${escapeHtml(`${reveal.effectiveTitle}, ${reveal.effectiveDate}, ${timelineName(event.timelineId)}${erased ? ", erased on this path" : ""}`)}"
        aria-pressed="${selected}"
      >
        <span class="curve-node-core"></span>
        <span class="curve-node-label">${escapeHtml(reveal.effectiveTitle)}</span>
      </button>
      `;
    })
    .join("");

  const headingMarkup = state.timelines
    .map((timeline) => {
      const headingTimelineId = String(timeline.id);
      const ancestor = canon.ancestorTimelineIds.has(headingTimelineId);
      const muted =
        timelineId !== "all" && timelineId !== headingTimelineId && !ancestor;
      return `
        <span
          class="curve-lane-heading${ancestor ? " is-ancestor" : ""}${muted ? " is-muted" : ""}"
          data-timeline-id="${escapeHtml(headingTimelineId)}"
          style="--timeline-color:${escapeHtml(state.timelineColorById.get(headingTimelineId))}"
        >${escapeHtml(timelineName(headingTimelineId))}</span>
      `;
    })
    .join("");

  mapCanvas.classList.remove("full-data-map");
  mapCanvas.classList.add("curved-data-map");
  mapCanvas.style.height = `${mapHeight}px`;
  mapCanvas.style.width = "100%";
  mapCanvas.innerHTML = `
    <div class="curve-lane-headings">${headingMarkup}</div>
    <svg class="curve-svg" viewBox="0 0 ${mapWidth} ${mapHeight}" preserveAspectRatio="none" aria-hidden="true">
      ${pathMarkup}
      ${jumpMarkup}
    </svg>
    ${markerMarkup}
    ${nodeMarkup}
  `;
}

function renderEpisodes() {
  episodesView.querySelector(".episode-loading")?.remove();
  episodesView.querySelectorAll(".episode-section").forEach((section) => section.remove());
  document.querySelector("#episodes-view .view-toolbar-copy strong").textContent =
    "Browse reveals by episode";
  document.querySelector("#episodes-view .view-toolbar-copy span").textContent =
    `${state.reveals.length} reveals across ${state.episodes.length} episodes`;

  const sections = state.episodes.map((episode) => {
    const reveals = state.reveals.filter((reveal) => reveal.episodeId === String(episode.id));
    const eventRows = reveals
      .map((reveal) => {
        const event = reveal.event;
        const selected = reveal.id === state.selectedRevealId;
        const relationLabel = event.eventType
          ? event.eventType.replace("-", " ")
          : timelineName(event.timelineId);
        return `
          <button
            class="episode-event${selected ? " is-selected" : ""}"
            type="button"
            data-event-id="${escapeHtml(event.id)}"
            data-reveal-id="${escapeHtml(reveal.id)}"
          >
            ${imageMarkup(reveal, "")}
            <span class="episode-event-copy">
              <small>${escapeHtml(formatEpisodeTime(reveal.episodeTime))} · ${escapeHtml(reveal.effectiveDate)}</small>
              <strong>${escapeHtml(reveal.effectiveTitle)}</strong>
              <span class="relationship-tag">${escapeHtml(relationLabel)}</span>
            </span>
          </button>
        `;
      })
      .join("");

    return `
      <section class="episode-section" id="episode-${escapeHtml(episode.id)}">
        <div class="episode-heading">
          <div>
            <span>Episode ${episode.episodeNumber}</span>
            <h2>${escapeHtml(episode.title)}</h2>
          </div>
          <small>${reveals.length} reveals</small>
        </div>
        <div class="episode-events">${eventRows}</div>
      </section>
    `;
  });

  episodesView.insertAdjacentHTML("beforeend", sections.join(""));
}

function adjacentNarrativeReveals(reveal, selectedTimelineId) {
  const activeEventIds =
    selectedTimelineId === "all"
      ? null
      : canonicalContext(selectedTimelineId).activeEventIds;
  const narrativeReveals = state.events.flatMap((event) => event.reveals);
  const onPath =
    selectedTimelineId === "all"
      ? narrativeReveals
      : narrativeReveals.filter((candidate) => activeEventIds.has(candidate.eventId));
  const index = onPath.findIndex((candidate) => candidate.id === reveal.id);
  if (index >= 0) {
    return {
      previous: index > 0 ? onPath[index - 1] : null,
      next: index < onPath.length - 1 ? onPath[index + 1] : null,
    };
  }

  const onPathIds = new Set(onPath.map((candidate) => candidate.id));
  const globalIndex = narrativeReveals.findIndex((candidate) => candidate.id === reveal.id);
  return {
    previous:
      narrativeReveals
        .slice(0, globalIndex)
        .reverse()
        .find((candidate) => onPathIds.has(candidate.id)) ?? null,
    next:
      narrativeReveals
        .slice(globalIndex + 1)
        .find((candidate) => onPathIds.has(candidate.id)) ?? null,
  };
}

function revealTitle(reveal) {
  return reveal?.effectiveTitle ?? "No adjacent event";
}

function renderDetail() {
  const reveal = state.revealById.get(state.selectedRevealId);
  if (!reveal) return;
  const event = reveal.event;
  const episode = state.episodeById.get(reveal.episodeId);
  const selectedTimelineId = document.querySelector("#timeline-select")?.value ?? "all";
  const erased =
    selectedTimelineId !== "all" &&
    canonicalContext(selectedTimelineId).erasedEventIds.has(event.id);
  const soundtrack = state.soundtrackById.get(String(event.soundtrackId));
  const { previous, next } = adjacentNarrativeReveals(reveal, selectedTimelineId);

  document.querySelector("#handle-meta").textContent = erased
    ? `Erased on ${timelineShortName(selectedTimelineId)} · Episode ${episode?.episodeNumber ?? "?"}`
    : `${timelineName(event.timelineId)} · Episode ${episode?.episodeNumber ?? "?"}`;
  document.querySelector("#handle-title").textContent = reveal.effectiveTitle;
  document.querySelector("#detail-time").textContent = formatEpisodeTime(reveal.episodeTime);
  document.querySelector("#detail-date").textContent = reveal.effectiveDate;
  document.querySelector("#detail-episode").textContent =
    `Episode ${episode?.episodeNumber ?? "?"}`;
  document.querySelector("#detail-title").textContent = reveal.effectiveTitle;
  document.querySelector("#detail-description").textContent = reveal.effectiveDescription;
  document.querySelector("#detail-image").src = reveal.effectiveScreenshot
    ? IMAGE_BASE + reveal.effectiveScreenshot
    : "";
  document.querySelector("#detail-image").alt = reveal.effectiveScreenshot
    ? `Still from ${reveal.effectiveTitle}`
    : "";
  document.querySelector("#detail-image").hidden = !reveal.effectiveScreenshot;

  const previousEventButton = document.querySelector("#previous-event");
  const nextEventButton = document.querySelector("#next-event");
  previousEventButton.disabled = !previous;
  nextEventButton.disabled = !next;
  previousEventButton.dataset.targetRevealId = previous?.id ?? "";
  nextEventButton.dataset.targetRevealId = next?.id ?? "";
  previousEventButton.setAttribute(
    "aria-label",
    previous ? `Previous event: ${revealTitle(previous)}` : "No previous event"
  );
  nextEventButton.setAttribute(
    "aria-label",
    next ? `Next event: ${revealTitle(next)}` : "No next event"
  );

  document.querySelector("#detail-tags").innerHTML = [
    ...(erased
      ? [
          `<span class="detail-tag is-erased">Erased on ${escapeHtml(timelineShortName(selectedTimelineId))}</span>`,
          `<span class="detail-tag">${escapeHtml(timelineName(event.timelineId))}</span>`,
        ]
      : []),
    ...(event.tags ?? []).map(
      (tag) => `<span class="detail-tag">${escapeHtml(tag)}</span>`
    ),
  ].join("");

  const soundtrackLink = document.querySelector("#soundtrack-link");
  soundtrackLink.hidden = !soundtrack?.mediaUrl;
  if (soundtrack?.mediaUrl) {
    soundtrackLink.href = soundtrack.mediaUrl;
    document.querySelector("#soundtrack-title").textContent = soundtrack.title;
  }
}

function updateSelectionClasses() {
  const selectedReveal = state.revealById.get(state.selectedRevealId);
  document.querySelectorAll("[data-event-id]").forEach((element) => {
    const isEpisodeRow = element.hasAttribute("data-reveal-id");
    const selected = isEpisodeRow
      ? element.dataset.revealId === state.selectedRevealId
      : element.dataset.eventId === selectedReveal?.eventId;
    element.classList.toggle("is-selected", selected);
    element.setAttribute("aria-pressed", String(selected));
  });
}

function selectReveal(revealId, openSheet = true) {
  if (!state.revealById.has(String(revealId))) return;
  state.selectedRevealId = String(revealId);
  updateSelectionClasses();
  renderDetail();
  if (openSheet) {
    sheet.classList.add("is-open");
    document.querySelector("#detail-handle").setAttribute("aria-expanded", "true");
  }
}

function selectEvent(eventId, openSheet = true) {
  const event = state.eventById.get(String(eventId));
  if (!event?.reveals.length) return;
  selectReveal(event.reveals.at(-1).id, openSheet);
}

function centerSelectedInActiveView() {
  const reveal = state.revealById.get(state.selectedRevealId);
  if (!reveal) return;
  window.setTimeout(() => {
    if (state.activeView === "map") {
      const node = document.querySelector(
        `#map-view [data-event-id="${CSS.escape(reveal.eventId)}"]`
      );
      const laneHeadings = document.querySelector(".curve-lane-headings");
      if (!node || !laneHeadings) return;
      const viewRect = mapView.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const visibleTop = Math.max(viewRect.top, laneHeadings.getBoundingClientRect().bottom) + 12;
      const visibleBottom = viewRect.bottom - 88;
      const desiredY = visibleTop + (visibleBottom - visibleTop) / 2;
      mapView.scrollTo({
        top: mapView.scrollTop + nodeRect.top + nodeRect.height / 2 - desiredY,
        left:
          mapView.scrollLeft +
          nodeRect.left +
          nodeRect.width / 2 -
          (viewRect.left + viewRect.width / 2),
        behavior: "smooth",
      });
      return;
    }

    document
      .querySelector(`#episodes-view [data-reveal-id="${CSS.escape(reveal.id)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, 30);
}

function setView(view) {
  state.activeView = view;
  const mapActive = view === "map";
  mapView.hidden = !mapActive;
  episodesView.hidden = mapActive;
  document.querySelector("#map-tab").classList.toggle("is-active", mapActive);
  document.querySelector("#episodes-tab").classList.toggle("is-active", !mapActive);
  document.querySelector("#map-tab").setAttribute("aria-selected", String(mapActive));
  document.querySelector("#episodes-tab").setAttribute("aria-selected", String(!mapActive));

  const reveal = state.revealById.get(state.selectedRevealId);
  if (mapActive && reveal) {
    const timelineSelect = document.querySelector("#timeline-select");
    const currentCanon = canonicalContext(timelineSelect.value);
    const selectedEventVisible =
      currentCanon.activeEventIds.has(reveal.eventId) ||
      currentCanon.erasedEventIds.has(reveal.eventId);
    if (
      timelineSelect.value !== "all" &&
      !selectedEventVisible
    ) {
      timelineSelect.value = reveal.event.timelineId;
      renderMap();
      renderDetail();
    }
  }
  if (!mapActive && reveal) {
    document.querySelector("#episode-select").value = reveal.episodeId;
  }
  updateSelectionClasses();
  centerSelectedInActiveView();
}

function bindInteractions() {
  mapView.addEventListener("click", (event) => {
    const button = event.target.closest("[data-event-id]");
    if (button) selectEvent(button.dataset.eventId);
  });
  episodesView.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reveal-id]");
    if (button) selectReveal(button.dataset.revealId);
  });
  document.querySelector("#map-tab").addEventListener("click", () => setView("map"));
  document.querySelector("#episodes-tab").addEventListener("click", () => setView("episodes"));
  document.querySelector("#detail-handle").addEventListener("click", () => {
    const isOpen = sheet.classList.toggle("is-open");
    document.querySelector("#detail-handle").setAttribute("aria-expanded", String(isOpen));
    if (!isOpen && state.activeView === "map") centerSelectedInActiveView();
  });
  document.querySelector("#previous-event").addEventListener("click", (event) => {
    selectReveal(event.currentTarget.dataset.targetRevealId);
    centerSelectedInActiveView();
  });
  document.querySelector("#next-event").addEventListener("click", (event) => {
    selectReveal(event.currentTarget.dataset.targetRevealId);
    centerSelectedInActiveView();
  });
  document.querySelector("#share-explorer").addEventListener("click", () => {
    const reveal = state.revealById.get(state.selectedRevealId);
    showToast(`Share link ready for “${reveal?.effectiveTitle ?? "this moment"}”`);
  });
  window.addEventListener("resize", () => {
    const width = mapView.clientWidth;
    if (state.dataset && width && width !== state.mapWidth) renderMap();
  });
}

async function loadExplorer() {
  document.querySelector("#map-view .view-toolbar-copy strong").textContent =
    "Loading the complete timeline…";
  document.querySelector("#episodes-view .view-toolbar-copy strong").textContent =
    "Loading all episodes…";

  try {
    const response = await fetch(DATASET_URL);
    if (!response.ok) throw new Error(`Dataset request failed with HTTP ${response.status}`);
    const dataset = await response.json();
    normalizeDataset(dataset);
    if (!state.events.length || !state.reveals.length) {
      throw new Error("The dataset did not contain events and reveals");
    }

    setupSelectors();
    state.selectedRevealId = state.events[0].displayReveal.id;
    renderMap();
    renderEpisodes();
    bindInteractions();
    selectReveal(state.selectedRevealId, false);
  } catch (error) {
    console.error("Unable to load the full explorer dataset", error);
    mapCanvas.innerHTML = `
      <div class="explorer-error">
        The complete dataset could not be loaded. Open this prototype through the local
        server rather than as a file, then reload.
      </div>
    `;
  }
}

void loadExplorer();
