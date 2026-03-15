# Timeline Data Editor

A web-based CRUD interface for managing timeline data with React frontend and Java Spring Boot backend. Designed for editing complex narrative timelines with events, reveals, episodes, and metadata.

## Features

- **Timeline Management**: Create and edit timelines with narrative dates and slices
- **Event System**: Manage events with tags, types, and timing notes
- **Reveal System**: Track when and how information is revealed to viewers
- **Episode Management**: Organize content by episodes with durations
- **Soundtrack Integration**: Manage OST tracks and their positioning
- **Notes System**: Add contextual notes linked to events
- **Dataset Export**: Export complete datasets as JSON or ZIP with images
- **Real-time Updates**: WebSocket integration for live metadata updates
- **Image Management**: Upload and manage screenshot images for reveals
- **Clean UI**: Modern, responsive interface with Tailwind CSS

## Quick Start

### Prerequisites
- Java 17 or higher
- Maven 3.6+
- Node.js 16+ and npm

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd timeline-data-editor
   ```

2. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Start both services**:
   ```bash
   ./start-app.sh
   ```

That's it! The script will start both the backend and frontend automatically.

### Manual Start (Alternative)

If you prefer to start services manually:

**Backend** (Terminal 1):
```bash
cd backend-java
mvn spring-boot:run
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```

## Access Points

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:5001
- **H2 Console**: http://localhost:5001/h2-console (for database debugging)

## Usage

1. **Open the application** at http://localhost:5174
2. **Navigate tables** using the sidebar to edit different data types
3. **Add records** using the "Add New" buttons
4. **Edit records** by clicking the edit icons
5. **Search and filter** using the search bars
6. **Export data** using the export button in the sidebar (with optional image inclusion)

## Data Export

The application includes a comprehensive export system:

- **JSON Export**: Export dataset as JSON file
- **ZIP Export**: Export dataset with all referenced images
- **Automatic Versioning**: Dataset version updates on any data change
- **Real-time Metadata**: Live updates via WebSocket

Export files are named: `{dataset-id}.{version}.{json|zip}`

## Project Structure

```
timeline-data-editor/
├── backend-java/
│   ├── src/main/java/com/timeline/editor/
│   │   ├── controller/          # REST API controllers
│   │   ├── model/              # JPA entities
│   │   ├── repository/         # Data repositories
│   │   ├── service/            # Business logic
│   │   └── config/             # Configuration classes
│   ├── src/main/resources/
│   │   ├── db/migration/       # Flyway database migrations
│   │   └── application.properties
│   └── data/
│       ├── images/             # Uploaded images
│       └── narrative.mv.db # H2 database
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── api/                # API client
│   │   ├── contexts/           # React contexts
│   │   └── styles/             # CSS styles
│   └── package.json
├── start-app.sh                # Unified startup script
└── README.md
```

## Database Schema

The application uses an H2 database with the following main entities:

- **Timeline**: Narrative timelines with slices
- **Event**: Events with tags, types, and timing
- **Reveal**: When/how information is revealed
- **Episode**: Episodes with durations and metadata
- **Soundtrack**: OST tracks with positioning
- **Note**: Contextual notes linked to events
- **EventTag**: Tags for categorizing events
- **DatasetMetadata**: Dataset information and versioning

## API Endpoints

### Core CRUD Operations
- `GET /api/tables/{table}` - Get table data
- `POST /api/tables/{table}` - Create record
- `PUT /api/tables/{table}/{id}` - Update record
- `DELETE /api/tables/{table}/{id}` - Delete record

### Specialized Endpoints
- `GET /api/metadata` - Get dataset metadata
- `GET /api/export/dataset` - Export dataset (JSON)
- `GET /api/export/dataset?includeImages=true` - Export with images (ZIP)
- `POST /api/tables/reveal/{id}/image` - Upload reveal image
- `GET /api/tables/reveal/{id}/image/{filename}` - Get reveal image

### WebSocket
- `ws://localhost:5001/ws` - WebSocket connection for real-time updates
- `/topic/metadata` - Subscribe to metadata updates

## Development

### Backend Development
- **Framework**: Spring Boot with JPA/Hibernate
- **Database**: H2 with Flyway migrations
- **Build Tool**: Maven
- **Features**: REST API, WebSocket, file uploads, automatic versioning

### Frontend Development
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Features**: Real-time updates, file downloads, responsive design

### Key Features Implemented
- ✅ **Automatic Versioning**: Dataset version updates on any data change
- ✅ **Real-time Updates**: WebSocket integration for live metadata
- ✅ **Image Management**: Upload and serve images for reveals
- ✅ **Data Export**: JSON and ZIP export with image inclusion
- ✅ **Unified Startup**: Single script to start both services

## Troubleshooting

- **Backend won't start**: Ensure Java 17+ and Maven are installed
- **Frontend won't start**: Run `npm install` in the frontend directory
- **Port conflicts**: Backend uses 5001, frontend uses 5174
- **Database issues**: Check H2 console at http://localhost:5001/h2-console
- **Export fails**: Ensure images directory exists and has proper permissions

## License

This project is open source and available under the MIT License.