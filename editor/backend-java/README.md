# Timeline Data Editor Backend

Spring Boot backend for the timeline editor.

## Current Model

- Java 17
- Spring Boot 3.2
- JPA/Hibernate
- in-memory H2 database
- Flyway for schema and content loading
- REST API plus WebSocket metadata updates

The backend reads project data from `TIMELINE_DATA_DIR`:

- `flyway_dump/` for content SQL
- `images/` for reveal screenshots
- `export/` for filesystem exports

## Running

From `backend-java/`:

```bash
mvn spring-boot:run
```

Or from `editor/`:

```bash
TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo ./start-app.sh
```

Default URLs:

- API: `http://localhost:5001`
- H2 console: `http://localhost:5001/h2-console`

H2 console values:

- JDBC URL: `jdbc:h2:mem:narrative`
- Username: `sa`
- Password: leave empty

## Data Loading And Persistence

On startup the backend:

1. loads schema migrations from `src/main/resources/db/migration/`
2. loads content SQL from `$TIMELINE_DATA_DIR/flyway_dump`

When dataset metadata changes, the backend updates the dataset version and writes the current content snapshot back into `V1000__data.sql` in the data repo.

## Main Endpoints

- `GET /api/export/dataset` - export dataset JSON
- `POST /api/export/dataset/to-filesystem` - write dataset JSON or ZIP into the configured export path
- `GET /api/settings` - read app settings
- `PUT /api/settings` - update app settings
- `GET /api/metadata` - read dataset metadata
- `ws://localhost:5001/ws` - WebSocket endpoint
- `/topic/metadata` - metadata update topic

## Build

```bash
mvn clean package
```

## Notes

- local CORS is configured for Vite dev ports on `localhost` and `127.0.0.1`
- screenshot upload writes into `$TIMELINE_DATA_DIR/images`
- filesystem export defaults to `$TIMELINE_DATA_DIR/export`
