# Timeline Viewer

React/Vite viewer for the exported narrative dataset.

## Development

Install dependencies once:

```bash
npm install
```

Run the viewer dev server:

```bash
npm run dev
```

In development, the viewer reads live data from the editor backend at `http://localhost:5001/api/export/dataset` by default. Override with `VITE_EDITOR_API_URL` if you need a different backend.

Screenshots also use the editor backend in dev, so local edits show up without copying files.

## Static Build

The production build is file-based. It does **not** need a running editor.

```bash
TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo \
npm run build:static
```

That script:

1. Reads the newest JSON export from `$TIMELINE_DATA_DIR/export`
2. Copies screenshots from `$TIMELINE_DATA_DIR/images`
3. Writes them into `public/`
4. Runs the Vite build into `dist/`

Set `TIMELINE_DATA_DIR` to the root of your data repo before building. The build will fail if `TIMELINE_DATA_DIR/export` does not contain at least one exported dataset JSON.

## Optional API Export

If you want to capture `public/dataset.json` from a running editor instead of from files:

```bash
npm run fetch-data
```

This uses `TIMELINE_EDITOR_API_URL` or `http://localhost:5001/api/export/dataset`.

## PostHog

The preferred production path is a site-provided `runtime-config.js`, not local env files.

- `public/runtime-config.js` ships with analytics disabled by default
- deployed environments can override it with real values
- local dev remains analytics-off unless you intentionally opt in

The viewer supports env-based fallback only during `npm run dev`:

- `VITE_PUBLIC_POSTHOG_TOKEN`
- `VITE_PUBLIC_POSTHOG_HOST`
- `VITE_PUBLIC_POSTHOG_ENABLE_IN_DEV`

`npm run build` and `npm run preview` now use only `runtime-config.js`, so local preview builds do not send analytics unless you intentionally populate that file.

## Commands

- `npm run dev` - start the dev server
- `npm run build` - build from whatever is already in `public/`
- `npm run prepare-static` - stage dataset and screenshots from `TIMELINE_DATA_DIR`
- `npm run build:static` - stage files from `TIMELINE_DATA_DIR` and build
- `npm run fetch-data` - fetch `public/dataset.json` from a running editor
- `npm run lint` - run ESLint
- `npm test` - run Vitest
