# 🧰 Reveal Rendering Strategy

This document describes how the timeline viewer manages reveal visibility, segment layout, and playhead-driven interaction. It is intended for developers working on the rendering engine, and explains how the system behaves during playback, forward/backward scrubbing, and timeline navigation.

---

## 📐 Core Concepts

### Reveal
A *reveal* is a fragment of story that becomes visible to the viewer at a specific time. It is tied to a canonical event, but may appear in a different segment row (see `apparentTimeline`).

### Event
An *event* is a logical container for one or more reveals. It is not directly rendered; only its reveals are shown in the UI.

### Segment Row
A *segment* represents a continuous portion of real-world time on the horizontal axis. All timelines share the same segmented layout for visual consistency. Reveals are rendered into a segment row based on the value of `apparentTimeline`, which indicates the timeline context for that reveal. Events themselves are positioned based on their canonical `timelineDate`, which determines the segment.

### Universal Playhead
The system is driven by a single **global playhead**, measured in **seconds since the start of the show**. Every reveal has an `absoluteTime`, and is shown or hidden based on its comparison with the playhead.

---

## ⚖️ DOM Strategy

- **All reveals are rendered into the DOM on page load.**
- Each reveal is rendered **once**, into the segment row corresponding to its `apparentTimeline` (or `event.timelineId` if unset).
- Reveals are rendered in order of `absoluteTime`, and can be styled with `visible` and `hidden` classes.
- There is no dynamic DOM mounting or unmounting during playback or scrubbing.

---

## ◳ Reveal Visibility Rules

### Rule 1: One Visible Reveal Per Event
For each event, find the latest reveal with `absoluteTime <= playhead`. Show that reveal. Hide all others.

### Rule 2: Reveal Appears in Apparent Timeline
Render each reveal under its `apparentTimeline` segment row. This creates the illusion that events are shifting timelines as the story unfolds.

### Rule 3: No Reveal Yet = No Event Shown
If the playhead has not yet passed any reveal for a given event, the event will not be visible at all.

---

## ⏳ Playhead-Driven Behavior

### Forward Scrubbing
- As the playhead increases, new reveals become visible.
- The latest eligible reveal for each event takes over display.
- Previous reveals for that event are hidden.

### Backward Scrubbing
- When scrubbing backwards, newer reveals disappear.
- Earlier reveals for each event are restored.
- If the playhead goes before any of a given event's reveals, that event disappears entirely.

---

## ⚙️ Implementation Summary

- **Render** each reveal once into the DOM under the correct segment row.
- **On playhead update**, find the most recent visible reveal per event.
- **Add** a `.visible` class to that reveal and **remove** it from others.
- **Use CSS** to style `.visible` vs `.hidden` for performance and animation.
- **Repeat** this logic continuously during scrubbing, playback, or seeking.

---

## 🚀 Example DOM Structure

```html
<!-- Segment row for TL2 -->
<div class="segment" data-timeline-id="tl2">
  <div class="reveal hidden" data-event-id="tl1-sol-accident" data-time="7070" data-reveal-id="r1">...</div>
</div>

<!-- Segment row for TL1 -->
<div class="segment" data-timeline-id="tl1">
  <div class="reveal hidden" data-event-id="tl1-sol-accident" data-time="22725" data-reveal-id="r4">...</div>
</div>
```

---

## 🔄 Recap Table

| Concept                  | Behavior |
|--------------------------|----------|
| **Reveal**              | Standalone visual unit, rendered by `apparentTimeline` |
| **Event**               | Logical grouping only. Not directly rendered |
| **Segment Row**         | Receives `.reveal` elements as children |
| **Playhead**            | Global time cursor controlling visibility |
| **Forward Scrubbing**   | Reveals emerge when `absoluteTime <= playhead` |
| **Backward Scrubbing**  | Reveals hide again; earlier states restored |

---

## 🚜 Next Steps

To implement this behavior:
- Create a render function that places each reveal into the right segment row.
- Maintain a map of eventId -> list of reveals.
- On playhead update, loop over each event and toggle visibility for its reveals.
- Use requestAnimationFrame or similar throttling for performance during scrubbing.

Let us know if you'd like helper utilities or full integration examples.

