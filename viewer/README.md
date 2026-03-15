# Timeline Viewer

A dynamic timeline visualization tool for non-linear narratives, built with React, TypeScript, and Tailwind CSS.

## Features

- Dynamic timeline rendering with support for multiple timelines
- Playhead-based reveal system
- Interactive event viewer
- Time-based navigation controls
- Support for mutable timelines and narrative reveals

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/timeline-viewer.git
   cd timeline-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`.

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📁 Project Structure

```
timeline-viewer/
├── src/
│   ├── components/     # React components
│   ├── types/         # TypeScript type definitions
│   ├── data/          # Sample and test data
│   ├── utils/         # Utility functions
│   └── hooks/         # Custom React hooks
├── public/            # Static assets
└── tests/            # Test files
```

## 📝 Data Files

The application uses JSON data files that follow the `TimelineViewerTransformedSchema`. Sample data is provided in `src/data/sample-timeline.json`.

### Schema Overview

The data structure includes:
- Episodes: Series episodes with metadata
- Timelines: Multiple timeline views
- Events: Timeline events with reveals
- Notes: Additional context and annotations

## 🎯 Implementation Progress

### ✅ Step 0: Bootstrap Project
- [x] Set up React + TypeScript + Tailwind project with Vite
- [x] Configure development tooling and build system
- [x] Add unit test support with Vitest and Testing Library
- [x] Create basic project structure
- [x] Add initial components (App, Timeline, EpisodeList)
- [x] Set up sample data structure

### ✅ Step 1: Sample Data Integration & Rendering Pipeline
- [x] Build parser for transformed JSON data
- [x] Implement schema validation using Ajv
- [x] Write unit tests for schema validation
- [x] Create data loading utility with error handling
- [x] Set up static timeline layout

### 🔄 Next Steps
- [ ] Step 2: Static UI Layout
- [ ] Step 3: Segment Scaling and Compression
- [ ] Step 4: Playhead Simulation
- [ ] Step 5: Reveal Viewer & Interactivity
- [ ] Step 6: Timeline Visibility Logic
- [ ] Step 7: Reveal Field Overrides
- [ ] Step 8: Styling and Visual Transitions
- [ ] Step 9: Finalize Controller Behavior
- [ ] Step 10: Localization & Config Support

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests (using Vitest)
- `npm run lint` - Run linter

## 🚀 Deployment

Screenshot images are not stored in this repo. The canonical source is your data repo (e.g. `runner-data/images/`). In dev the viewer loads images from the editor API; for a static build you must copy images from the data repo before building.

### Using a data-repo build script (recommended)

If you use a site build script (e.g. `runner-site/scripts/build.sh`), it copies JSON from the data repo's `export/` and images from `images/` into the viewer, then runs `npm run build`. The built site serves images from `/images/screenshots/`.

### Standalone zip deploy

To build a deployment zip with images:

```bash
# Copy images from your data repo into the viewer (one-time or from your build env)
mkdir -p public/images/screenshots
cp /path/to/runner-data/images/* public/images/screenshots/

# Build and zip
npm run build
cd dist && zip -r ../timeline-viewer-deploy.zip . && cd ..
```

The zip contains the built app and screenshot images.

### Testing

The project uses Vitest for testing. To run tests:

```bash
npm test
```

Key test files:
- `src/utils/schema.test.ts` - Tests for data validation
- `src/utils/dataLoader.test.ts` - Tests for data loading
- `src/components/*.test.tsx` - Component tests

The test suite includes:
- Schema validation using Ajv
- Data loading and error handling
- Component rendering and interactions

## Data Structure

The timeline data is defined in JSON format following the schema defined in `src/types/timeline.ts`. To add or modify timeline data:

1. Create a new JSON file in the `src/data` directory
2. Follow the schema structure for timelines, events, and reveals
3. Import and use the data in your components

## Project Structure

```
src/
  ├── components/     # React components
  ├── types/         # TypeScript type definitions
  ├── data/          # Timeline data files
  ├── utils/         # Utility functions
  └── hooks/         # Custom React hooks
```

## Dependencies

Key dependencies:
- React + TypeScript
- Tailwind CSS for styling
- Vitest for testing
- Ajv and ajv-formats for JSON schema validation
- Testing Library for component testing

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
