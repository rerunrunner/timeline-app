### 🧠 Bootstrap for Cursor

#### **Context**

I'm an experienced software developer, primarily focused on back-end systems and infrastructure. I'm now working on a project that involves front-end development — an area where I have less hands-on experience.\
My goal is to build clean, maintainable, user-friendly software while deepening my understanding of front-end technologies and best practices.\
I’d like you to keep this in mind as you help implement and recommend changes.

---

#### **Project Overview: Timeline Viewer**

I want to build a fan website that features a dynamic timeline. This is particularly challenging because:

- The story is told out of chronological order.
- Events are often shown before their full context is revealed.
- The main character (Sol) goes back in time, which alters the timeline — but does not create true branches (i.e., no multiverse).

We can initially model this using "branches," but I believe the story represents a **mutable timeline**, not a forked one. That complexity can be handled in the **display logic**, not deeply reflected in the data model.

---

### 🛠 Development Phases

1. **Data Collection & Modeling** ✅ *(done)*
2. **Implementation (Build the App)** *(current phase)*
   - Explore whether the timeline can be designed as a **standalone reusable module**.
   - Prefer generic naming — avoid show-specific terminology in code.
   - Evaluate third-party timeline libraries, but we may need to build our own.
3. **Publishing & Feedback**
   - Ensure timeline data is **obfuscated** in the public version.

---

### 🧱 Component Architecture

1. **Core page elements** – header, footer, etc.
2. **Timeline Display**
   - As the playhead progresses, the timeline updates.
   - New events are added to the timeline as they are revealed, or existing events are enriched with new context.
3. **Controller**
   - A playbar spanning the full runtime of all episodes.
   - Includes:
     - Episode markers
     - Play/scrub controls (e.g. 60x, 120x, 1x)
     - A time input composed of a dropdown for selecting episode (e.g. `ep4`) and a text field for entering hh\:mm\:ss (e.g. `40:00`). When submitted, the playhead jumps to the corresponding absoluteTime and the Reveal Viewer updates to show the most recent reveal available at that point.
4. **Event Viewer**
   - A component for showing more information about an event than would be possible by directly hovering over a point on the timeline
   - Includes: title, date, description, and images.
5. **Data Layer**
   - Powers both the controller and the timeline.
   - Includes:
     - Episode metadata (length, number, etc.)
     - Timeline events and reveals
   - Will reside client-side (no backend/API needed for timeline functionality)
   - Should be modular and reusable — ideally something that could be open-sourced in the future

---

### 🗃️ Transformed Data Schema

```yaml
TimelineViewerTransformedSchema:
  type: object
  description: >
    Output structure for timeline data after transformation from source CSV.
    Includes timelines with nested slices (using precise timestamps), events with nested reveals, and a flat list of notes.

  properties:
    episodes:
      type: array
      items:
        $ref: '#/definitions/Episode'

timelines:
      type: array
      items:
        $ref: '#/definitions/Timeline'

    events:
      type: array
      items:
        $ref: '#/definitions/Event'

    notes:
      type: array
      items:
        $ref: '#/definitions/Note'

definitions:
  Episode:
    type: object
    required: [id, number, title, duration]
    properties:
      id: string
      number: integer
      title: string
      duration:
        type: integer
        description: Total runtime of the episode in seconds

  Timeline:
    type: object
    required: [id, name, slices]
    properties:
      id: string
      name: string
      description:
        type: string
        nullable: true
      slices:
        type: array
        items:
          $ref: '#/definitions/TimelineSlice'

  TimelineSlice:
    type: object
    required: [id, timelineId, shortDescription, startTimestamp, endTimestamp]
    properties:
      id: string
      timelineId: string
      shortDescription: string
      startTimestamp:
        type: string
        format: date-time
        description: ISO datetime (e.g., 2008-06-02T09:00:00)
      endTimestamp:
        type: string
        format: date-time
        description: ISO datetime (e.g., 2008-06-15T17:00:00)
      importance:
        type: string
        enum: [low, high]
        nullable: true

  Event:
    type: object
    required: [id, timelineId, timelineDate, shortDescription]
    properties:
      id: string
      timelineId: string
      shortDescription: string
      timelineDate:
        type: string
        format: date-time
        description: Canonical world date/time (e.g., 2008-09-01T12:00:00)
      timingNotes:
        type: string
        nullable: true
      tags:
        type: array
        items: { type: string }
      eventType:
        type: string
        nullable: true
        description: Optional event classification. Reserved types may include 'episode-ending', 'timeslip', and others used for rendering logic.
      reveals:
        type: array
        items:
          $ref: '#/definitions/Reveal'

  Reveal:
    type: object
    required: [id, tleventId, absoluteTime]
    properties:
      id: string
      tleventId: string
      apparentTimeline:
        type: string
        nullable: true
      assumedTimeline:
        type: string
        nullable: true
      absoluteTime:
        type: integer
        description: Cumulative seconds from the start of the entire series (used to place reveals on a playhead). This value is always an integer representing raw seconds (not a formatted time string).
      displayedDate: string
      displayedTitle: string
      displayedDescription: string
      screenshotLink:
        type: string
        nullable: true

  Note:
    type: object
    required: [id, title, body]
    properties:
      id: string
      title: string
      contextEventId:
        type: string
        nullable: true
      body: string
```

---

### 🔀 Slices vs Segments

**Slices** and **segments** are both horizontal groupings on the timeline but serve very different purposes:

| Concept          | Slices                                            | Segments                                             |
| ---------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Defined in data? | ✅ Yes — in the `TimelineSlice` schema             | ❌ No — computed dynamically by the renderer          |
| Purpose          | Narrative/logical structure across timeline views | Visual control of horizontal scaling and spacing     |
| Scope            | Defined per timeline, may repeat across timelines | Global across all timelines                          |
| Affects          | Grouping, truncation, alignment across timelines  | Pixel-per-time scaling, visual compression/expansion |

- A **slice** may span across multiple **segments**.
- A **segment** may contain multiple slices, or parts of several slices.

#### 🧪 Example: Software Project Timeline

- `slice-1`: “Planning Phase” → Jan 1 – Feb 15
- `slice-2`: “Implementation” → Feb 15 – May 1
- `slice-3`: “QA & Release” → May 1 – Jun 30

Segments computed by renderer:

- Segment A: Jan 1 – Jan 15 → low density (compressed)
- Segment B: Jan 15 – Apr 1 → high density (expanded)
- Segment C: Apr 1 – Jun 30 → moderate density

In this case:

- `slice-2` spans Segment B and C
- Segment B contains parts of `slice-1` and `slice-2`

Slices represent structured phases of the timeline; segments control layout and compression.

---

### ✅ Functional Requirements

#### 📝 Tags and Notes (Planned)

- The data model supports tags on events and freeform notes associated with events.
- These features are **not part of the initial implementation**, but may be used in future versions to support search, filtering, annotation, or extended timeline interaction.

#### 🎬 Reveal Viewer Behavior

- Before any reveals have been reached (e.g., at t = 0), the reveal viewer displays a placeholder state.
- When the user jumps to a new time via the controller (e.g., selecting `ep3 40:00`), the Reveal Viewer updates to display the latest reveal visible at that time.
- The reveal viewer shows the most recent revealed event as the playhead progresses.
- There is no visual playhead indicator rendered on the timeline itself. The playhead exists conceptually and is driven solely by the controller (playbar), not rendered as a vertical line across the timelines.
- Hovering over an event shows a temporary preview of that event’s latest reveal in the reveal viewer.
- Clicking an event locks the viewer to that reveal. While locked, the viewer no longer updates with the playhead.
- The lock can be cleared by clicking a "close" or "unlock" icon in the viewer, or by pressing Escape or clicking outside the event. The user may also switch the locked view by clicking on a different event.
- Once unlocked, the viewer resumes tracking the playhead. If the player is paused, the viewer remains on the last revealed state. If a new reveal for the currently locked event becomes visible, the viewer should update to reflect the latest reveal. This update may involve partial field changes (e.g., updating only the screenshot or description). These changes may optionally be animated or visually emphasized to highlight that a reveal has evolved.

#### 📓 Reveal Overrides

- Events may have multiple reveals.
- Each subsequent reveal may override fields from previous reveals:
  - `displayedTitle`
  - `displayedDate`
  - `displayedDescription`
  - `screenshotLink`
- The most recently visible reveal (by `absoluteTime`) determines the final rendered version of those fields.
- If the user scrubs backward past a reveal point, the currently displayed reveal should revert to the most recent reveal whose absoluteTime is less than or equal to the playhead.

#### 📐 Global Timeline and Layout Rules

- Although episode divisions are not shown on the timeline by default, support for optional episode boundary markers can be added by defining special events in the source data (e.g., type: `episode-ending`). These markers can be styled distinctly if desired, but their presence is data-driven.

- All timelines are plotted against a shared global horizontal axis based on canonical `timelineDate` (ISO datetime).

- The global timeline spans from the earliest startTimestamp of any slice across all timelines to the latest endTimestamp.

- Each timeline is rendered as a horizontal row; rows are stacked vertically.

- Timeline rows should be spaced with sufficient vertical separation to ensure events with the same `timelineDate` on different timelines do not visually overlap.

- Events with the same `timelineDate` on the same timeline should be stacked vertically (within that row) to avoid collision.

- The full timeline must fit within the viewport (i.e., no horizontal scrolling).

- To support this, the total duration is divided into time segments, each with a configurable scale factor that determines how much horizontal space it occupies.

- All timelines must remain visually aligned:

  - Events with the same `timelineDate` appear vertically aligned across timelines.
  - Segment boundaries (e.g., compression breaks) must also line up across all rows.

#### 🧩 Timeline Slices

- Slices define narrative phases within a timeline. Each timeline is composed of an ordered set of slices (e.g., s1, s2, s3), which partition the timeline into meaningful, contiguous units. These slices may be reused across multiple timelines.  For Example:
  - Timeline TL1 may contain slices s1, s2, s3, s4
  - Timeline TL2 might reuse s1 and s2 (with s2 truncated), and introduce s5 and s6 to represent a diverging narrative path.
- Each slice has:
  - A canonical start and end timestamp
  - An optional importance level
- When reused across timelines, a slice must span its full canonical duration unless explicitly truncated. Truncation occurs when a new slice begins before the reused slice’s end time, signaling a narrative overwrite. Truncated slices must be visually clipped, even if their time range overlaps newer ones.
- When being rendered, slices may span multiple visual segments and may appear visually broken or compressed depending on segment scaling. However, their start and end boundaries must always align across all timelines where they appear, unless truncation is explicitly declared.
- The system should treat repeated slice IDs canonically:
  - Visual position and identity must remain consistent
  - Contextual differences (e.g., truncation, importance) may affect appearance but not core identity
  - Shared slice identity should support consistent visual styling, grouping logic, and labeling across timelines

#### 🕰 Time Segmentation and Density Warping

- The full timeline is divided into time segments.

- Each segment boundary should be visually labeled with its corresponding date to aid orientation and reinforce alignment.

- Segment scale factors are automatically computed by the renderer based on event density and are not defined statically in configuration.

- However, the system should support an optional configuration override to manually specify segment boundaries and scale factors if the automatic logic fails to produce a useful or readable layout.

- Each segment is automatically assigned a scale factor by the renderer based on event density:

  - Segments with high event density are visually expanded.
  - Segments with low event density are visually compressed.

- These segments are applied uniformly across all timelines to preserve horizontal alignment.

- Break markers are rendered at each segment boundary across all rows.

#### 🔁 Reveal and Event Visibility

- At the final playhead position (i.e., the end of the series), all reveals are visible, all events are shown, and all timelines with revealed events are rendered.

- Events are anchored by their canonical `timelineDate`.

- Timeline 1 always renders its first segment (by absoluteTime), even if it contains no visible events. Other timelines remain hidden until at least one of their events is revealed. Segments without any visible events are initially hidden and become visible dynamically as the user reaches their time range (e.g., via scrubbing), optionally accompanied by a transition effect (such as a zoom out) to avoid prematurely revealing structure.

- Reveals are assumed to be ordered uniquely by `absoluteTime`. If multiple reveals share the same timestamp, their order of visibility is undefined and should not be relied upon.

- An event becomes visible once its first reveal has been seen (based on `absoluteTime`).

- A timeline row becomes visible once any reveal assigned to that timeline has been revealed.

- Visibility is always playhead-driven unless the user hovers or manually selects an event.

#### 🧠 Assumed Timeline Context

- Reveals may include an `assumedTimeline` value to indicate what timeline the viewer is expected to think they’re on before the true timeline is revealed.
- This supports narrative misdirection and delayed clarity.
- Until the actual timeline becomes visible:
  - The reveal may be styled or presented as part of the `assumedTimeline`.
  - The real timeline row remains hidden until its visibility conditions are met.
- Once the correct timeline is revealed, the event is repositioned (if necessary) and restyled accordingly.

---

### 🎯 Goal

Timeline rendering logic should be cleanly abstracted into a standalone, generic module — ideally usable in other nonlinear/mutable timeline projects.

---

### 🧪 Initial Implementation Plan (Steps)

0. **Bootstrap Project**

   - Set up project structure using React + TypeScript + Tailwind.
   - Configure dev tooling, build system, and linting.
   - Add unit test support (e.g., Jest + Testing Library) and set up basic test scaffolding.
   - Add a `README.md`:
     - How to start the service
     - How to install dependencies
     - How to add/replace data files

1. **Sample Data Integration & Rendering Pipeline**

   - Build parser for the transformed JSON data.
   - Write unit tests for schema validation and field transformations.
   - Ensure loaded data conforms to the defined JSON schema, using a schema validation library (e.g., `ajv`).
   - Load and validate the data structure at runtime.
   - Render a static timeline layout using the provided small sample data file.
   - Confirm that timelines, segments, and events render at correct positions through visual inspection — ensuring correct horizontal and vertical placement, segment alignment, and spacing.

2. **Static UI Layout**

   - Implement base layout:
     - Header, footer, and timeline grid
     - Placeholder Event Viewer area
     - Stubbed Controller UI with play, scrub bar, time input
   - Use Tailwind from the outset to style layout, spacing, and base components.

3. **Segment Scaling and Compression**

   - Compute segments based on event density
   - Apply scale factors uniformly across timelines
   - Render date labels at segment boundaries
   - Allow config override for scale factors

4. **Playhead Simulation**

   - Implement playhead as series-relative time (seconds)
   - Support play/pause, scrubbing, jump-to-time input, and speed controls (1x, 60x, 120x)
   - Enable keyboard-based scrubbing using left/right arrow keys (with step size configurable, e.g. ±1s or ±5s)
   - Sync reveal visibility with playhead position

5. **Reveal Viewer & Interactivity**

   - Display current reveal from playhead
   - Handle hover (temporary preview) and click (lock)
   - Support unlock via escape, close icon, or click-away
   - Support reveal updates for locked event as new reveals appear

6. **Timeline Visibility Logic**

   - Render timeline 1 and its first segment always
   - Hide other timelines until they have revealed events
   - Reveal new segments dynamically as playhead reaches them

7. **Reveal Field Overrides**

   - Apply most recent reveal fields by `absoluteTime`
   - Revert to previous reveal on reverse scrub

8. **Styling and Visual Transitions**

   - Refine styling and apply visual polish using Tailwind:
     - Reveal viewer transitions, zoom effects, event focus
     - Enhance timeline row appearance and interactions

9. **Finalize Controller Behavior**

   - Snap scrubbing to episode boundaries
   - Validate and parse episode/time input

10. **Localization & Config Support**

- Load alternative data files
- Support UI string localization if needed

---

### 📦 Non-Functional Requirements

1. Timeline must be **fully data driven** — replacing the data file should instantly update the rendered timeline without any code changes.

2. Fast scrub support – app should handle reveal visibility efficiently at any scrub speed.

3. Support **internationalization** via multiple localized data files.

4. Internally, all times pertaining to episode runtime and time of reveal should be represented in **seconds**.

5. **Tech Stack:** React + TypeScript + Tailwind

   - Favor object-oriented design: avoid bloating rendering logic with calculation details that can live on objects.
   - Maintain clear separation between data and UI logic.
   - Build as a **single-page app**.

6. **Modular Architecture:** Timeline rendering logic should be structured for reuse in other projects — ideally as a standalone component or module.

7. **Development Tooling:** Optional dev-only features (e.g., debug overlays showing playhead, segments, and rendering state) may be included to aid testing and iteration.

8. **Accessibility Planning:** Accessibility features (e.g., keyboard navigation, ARIA roles) are not required for MVP but should be considered in post-MVP design.

