# Timeline App

Editor and viewer for multi-timeline narrative data. Shareable on GitHub with no user data in the repo.

## Layout

- **viewer/** — React app that displays timeline data (read-only). In dev it loads from the editor’s export API (live fetch + WebSocket). Production build is a static bundle with data packaged—no editor in the deploy pipeline.
- **editor/** — React frontend + Java backend for editing timeline data. Reads/writes data from a configurable directory.

## Data and config

User data (H2 database, images, exported JSON) lives in a **per-project repo** (e.g. `runner-data`). Run the editor with that directory set:

```bash
cd editor
TIMELINE_DATA_DIR=../../../runner-data ./start-app.sh
```

(The backend runs from `editor/backend-java`, so the path is relative to that; `../../../runner-data` goes up to the parent of timeline-app and into the data repo when repos are side-by-side.)

Export path in the editor UI defaults to `../../../runner-data/export` (relative to the backend working dir). **Images** live only in the data repo (`runner-data/images/`). In dev the viewer loads them via the editor API; for static deployment the build script copies from the data repo's `export/` and `images/` into the viewer, then builds.

## Export API (dev only)

When you’re working on data, the viewer in dev fetches from the editor’s export endpoint and subscribes to metadata updates over WebSocket. This is for local editing only; it is not part of the production deploy.

- **Endpoint:** `GET /api/export/dataset` — full dataset JSON (metadata, episodes, events, reveals, timelines, soundtracks, etc.).
- With the editor running on port 5001, the viewer uses `http://localhost:5001/api/export/dataset` by default. Optional: set `VITE_EDITOR_API_URL` in `viewer/.env` to point at another URL.

## Deep-linking the viewer

Open the viewer with **`?t=<seconds>`** (e.g. `/timeline/viewer.html?t=2780`) to start at that playhead time. Values are clamped to the dataset duration. The URL updates (debounced) as you scrub so you can copy a shareable link. In the event panel, the **share** button (tooltip: copy link to this moment) copies a URL with **`t`** set to that event’s reveal playtime (the reveal you’re seeing at the current playhead, or the event’s first reveal if it isn’t reached yet)—not the raw playhead if you’ve moved on in the episode.

## Running

- **Editor:** `cd editor && ./start-app.sh` (optionally set `TIMELINE_DATA_DIR`). The script runs `npm install` in the editor frontend automatically. Backend runs on port 5001.
- **Viewer (dev):** `cd viewer && npm install && npm run dev` (use `npm install --legacy-peer-deps` if needed). With the editor running, the viewer fetches from `http://localhost:5001/api/export/dataset` by default.

## Building the site (viewer)

The only production build is a static bundle that includes the dataset. Start the editor, then build from the `viewer/` directory.

1. **Start the editor** (so the build can fetch the dataset from the API):
   ```bash
   cd editor
   TIMELINE_DATA_DIR=../../../runner-data ./start-app.sh
   ```

2. **Install and build:**
   ```bash
   cd viewer
   npm install --legacy-peer-deps
   npm run build:static
   ```
   This fetches the dataset from `http://localhost:5001/api/export/dataset`, writes it to `public/dataset.json`, and runs the Vite build. Output is **`viewer/dist/`**: `index.html`, `dataset.json`, and hashed JS/CSS in `dist/assets/`.

3. **Test the build locally:** `npm run preview`

## Deployment

Deploy **`viewer/dist/`** as static assets (any static host or CDN). The bundle is self-contained; the app loads `dataset.json` from the same origin. Screenshot image URLs in the data must be reachable (same origin or update base URLs in your export).

## Schema vs data migrations

- **Schema** migrations live in `editor/backend-java/src/main/resources/db/migration/` (e.g. `V1__schema.sql`). Commit in this repo.
- **Data** migrations (e.g. `V1000__data.sql`) live in the data repo's `flyway_dump/`. The app dumps there when you update metadata; commit in the data repo for git diff on content.
