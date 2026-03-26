# Timeline Data Editor

CRUD editor for the narrative dataset, with a React frontend and Spring Boot backend.

## What The Editor Owns

- schema migrations in `backend-java/src/main/resources/db/migration/`
- the editing UI
- the export API used by the local viewer
- writing updated content back into the data repo

The editor does **not** own the canonical narrative data repo. It reads and writes that through `TIMELINE_DATA_DIR`.

## Data Repo Contract

Point the backend at your data repo:

```bash
TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo ./start-app.sh
```

The backend uses:

- `flyway_dump/` for content migrations
- `images/` for reveal screenshots
- `export/` as the default filesystem export destination

## Running

From `editor/`:

```bash
./start-app.sh
```

This starts:

- frontend: `http://127.0.0.1:5174`
- backend: `http://localhost:5001`
- H2 console: `http://localhost:5001/h2-console`

The startup script installs frontend dependencies only if `node_modules/` is missing.

## Local Viewer Integration

The viewer dev server reads from the editor backend at `GET /api/export/dataset` and listens on `/ws` for metadata updates. That means local edits should appear in the viewer without using the filesystem export flow.

## Export Modes

The editor supports two different export paths:

- `GET /api/export/dataset` for live local development and browser downloads
- `POST /api/export/dataset/to-filesystem` for writing a versioned JSON or ZIP into the configured export directory

Filesystem export defaults to `TIMELINE_DATA_DIR/export`.

## Notes

- metadata updates bump the dataset version and write `V1000__data.sql` back into the data repo
- screenshot upload writes files into `TIMELINE_DATA_DIR/images`
- local CORS is configured for Vite dev ports on `localhost` and `127.0.0.1`