# Timeline App

Application code for the timeline editor and viewer. Narrative data stays in a separate data repo, selected with `TIMELINE_DATA_DIR`.

## Repos And Responsibilities

- `timeline-app/` owns app code, schema migrations, and local dev tooling.
- your data repo owns narrative content, exported JSON, and screenshots.
- `runner-site/` owns the deployable Cloudflare Pages site.

## Integration Points

There are two separate contracts between the app and the data repo:

- **Local runtime contract:** the editor backend reads `$TIMELINE_DATA_DIR/flyway_dump` and `$TIMELINE_DATA_DIR/images`, and the viewer dev server reads live data from the editor API.
- **Build contract:** static builds read `$TIMELINE_DATA_DIR/export` and `$TIMELINE_DATA_DIR/images` directly. Production builds do not require a running editor.

## Local Development

From the `timeline-app/` repo root, set `TIMELINE_DATA_DIR` and start the stack:

```bash
TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo ./start-dev.sh
```

This starts:

- viewer: `http://127.0.0.1:5173`
- editor frontend: `http://127.0.0.1:5174`
- editor backend: `http://127.0.0.1:5001`

The local viewer does **not** need a manual export step. In dev it fetches from `GET /api/export/dataset` on the editor backend and refreshes when metadata updates are broadcast over WebSocket.

## Production Viewer Build

The production/static viewer build reads files from `TIMELINE_DATA_DIR`, not from `localhost`.

From `viewer/`:

```bash
npm install
npm run build:static
```

`build:static` does three things:

1. Copies the newest JSON export from `$TIMELINE_DATA_DIR/export` to `viewer/public/dataset.json`
2. Copies `$TIMELINE_DATA_DIR/images` into `viewer/public/images/screenshots/`
3. Runs the Vite build into `viewer/dist/`

Set `TIMELINE_DATA_DIR` before building:

Example:

```bash
TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo npm run build:static
```

## Optional API-Based Export

If you explicitly want to fetch a dataset file from a running editor, use:

```bash
cd viewer
npm run fetch-data
```

This writes `viewer/public/dataset.json` from `TIMELINE_EDITOR_API_URL` or `http://localhost:5001/api/export/dataset`.

## Analytics Configuration

The deployed site can inject PostHog settings at runtime with `runtime-config.js`, so local developers do not need PostHog tokens in env files just to work on the app.

For local viewer dev, analytics remain off by default.

## Deep Linking

Open the viewer with `?t=<seconds>` (for example `/timeline/viewer.html?t=2780`) to start at that playhead time. The viewer keeps the URL in sync as you scrub so links stay shareable.

## Schema Vs Data Migrations

- Schema migrations live in `editor/backend-java/src/main/resources/db/migration/` and belong in this repo.
- Data migrations such as `V1000__data.sql` live in `$TIMELINE_DATA_DIR/flyway_dump` and belong in the data repo.
