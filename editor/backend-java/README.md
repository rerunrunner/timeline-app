# Timeline Data Editor - Java Backend

A Spring Boot REST API backend for the Timeline Data Editor, using H2 database with automatic migration from SQLite.

## Features

- **Spring Boot 3.2** with Java 17
- **H2 Database** with file-based storage
- **JPA/Hibernate** for ORM
- **Automatic Data Migration** from SQLite to H2
- **RESTful API** with full CRUD operations
- **CORS enabled** for frontend integration
- **H2 Console** for database debugging

## Tech Stack

- Java 17
- Spring Boot 3.2.0
- Spring Data JPA
- H2 Database 2.2.224
- Maven for dependency management

## Quick Start

### Prerequisites

- Java 17 or higher
- Maven 3.6+

### Installation & Setup

1. **Install dependencies**:
   ```bash
   cd backend-java
   mvn clean install
   ```

2. **Run the application**:
   ```bash
   mvn spring-boot:run
   ```

3. **Access the application**:
   - API: `http://localhost:5001`
   - H2 Console: `http://localhost:5001/h2-console`

### H2 Console Access

- **JDBC URL**: `jdbc:h2:file:./data/narrative`
- **Username**: `sa`
- **Password**: (leave empty)

## API Endpoints

### Schema & Health
- `GET /api/schema` - Get database schema metadata
- `GET /api/health` - Health check

### Episode Management
- `GET /api/tables/episode` - List all episodes
- `GET /api/tables/episode/{id}` - Get episode by ID
- `POST /api/tables/episode` - Create new episode
- `PUT /api/tables/episode/{id}` - Update episode
- `DELETE /api/tables/episode/{id}` - Delete episode
- `GET /api/tables/episode/references` - Get episode references for dropdowns

### Timeline Management
- `GET /api/tables/timeline` - List all timelines
- `GET /api/tables/timeline/{id}` - Get timeline by ID
- `POST /api/tables/timeline` - Create new timeline
- `PUT /api/tables/timeline/{id}` - Update timeline
- `DELETE /api/tables/timeline/{id}` - Delete timeline
- `GET /api/tables/timeline/references` - Get timeline references for dropdowns

### Event Management
- `GET /api/tables/event` - List all events
- `GET /api/tables/event/{id}` - Get event by ID
- `POST /api/tables/event` - Create new event
- `PUT /api/tables/event/{id}` - Update event
- `DELETE /api/tables/event/{id}` - Delete event

### Soundtrack Management
- `GET /api/tables/soundtrack` - List all soundtracks
- `GET /api/tables/soundtrack/{title}` - Get soundtrack by title
- `POST /api/tables/soundtrack` - Create new soundtrack
- `PUT /api/tables/soundtrack/{title}` - Update soundtrack
- `DELETE /api/tables/soundtrack/{title}` - Delete soundtrack

## Data Migration

The application automatically migrates data from SQLite (`data/narrative.db`) to H2 database on first startup. The migration:

1. Checks if H2 database is empty
2. Connects to SQLite database
3. Copies all table structures and data
4. Preserves foreign key relationships

## Database Configuration

The H2 database is configured to:
- Store data in `./data/narrative.mv.db` file
- Keep connections open (`DB_CLOSE_DELAY=-1`)
- Not close on exit (`DB_CLOSE_ON_EXIT=FALSE`)

## Development

### Project Structure
```
backend-java/
├── src/main/java/com/timeline/editor/
│   ├── TimelineDataEditorApplication.java    # Main application class
│   ├── controller/                          # REST controllers
│   │   ├── EpisodeController.java
│   │   ├── TimelineController.java
│   │   ├── EventController.java
│   │   └── SchemaController.java
│   ├── model/                              # JPA entities
│   │   ├── Episode.java
│   │   ├── Timeline.java
│   │   ├── Event.java
│   │   └── Soundtrack.java
│   ├── repository/                         # JPA repositories
│   │   ├── EpisodeRepository.java
│   │   ├── TimelineRepository.java
│   │   ├── EventRepository.java
│   │   └── SoundtrackRepository.java
│   └── util/                              # Utilities
│       └── DataMigrationRunner.java
├── src/main/resources/
│   └── application.properties             # Configuration
└── pom.xml                                # Maven configuration
```

### Adding New Tables

1. Create JPA entity in `model/` package
2. Create repository interface in `repository/` package
3. Create REST controller in `controller/` package
4. Update `SchemaController` if needed

### Building for Production

```bash
mvn clean package
java -jar target/timeline-data-editor-1.0.0.jar
```

## Integration with Frontend

The Java backend is designed to be a drop-in replacement for the Python Flask backend. It provides the same API endpoints and response formats, making it compatible with the existing React frontend.

## Troubleshooting

- **Port conflicts**: Change `server.port` in `application.properties`
- **Database issues**: Check H2 console at `/h2-console`
- **Migration problems**: Delete `data/narrative.mv.db` and restart
- **CORS issues**: Verify `spring.web.cors.allowed-origins` setting
