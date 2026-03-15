# OpenAPI Specification Plan

## Current State Analysis

### Problem Statement

The Timeline Data Editor API currently has:
- ❌ No formal API contract or specification
- ❌ No API documentation beyond code comments
- ❌ No versioning strategy
- ❌ No request/response validation documentation
- ❌ No standardized error responses
- ❌ Inconsistent endpoint naming (`/api/tables/reveal` vs `/api/dataset/metadata`)
- ❌ No client SDK generation capability
- ❌ No API testing tools (Swagger UI)

### Impact

1. **Poor Developer Experience**: Frontend devs must read Java code to understand API
2. **No Contract Testing**: API changes can break frontend without warning
3. **Manual Testing**: No Swagger UI for interactive API exploration
4. **Documentation Drift**: Code comments become stale
5. **No Client Generation**: Can't auto-generate TypeScript client
6. **Inconsistent Errors**: Each controller handles errors differently

---

## Target State

### OpenAPI 3.1 Specification

**Goals:**
- ✅ Single source of truth for API contract
- ✅ Auto-generated interactive documentation (Swagger UI)
- ✅ Request/response validation
- ✅ Standardized error responses
- ✅ TypeScript client generation for frontend
- ✅ API versioning strategy
- ✅ Consistent endpoint structure

**Benefits:**
- **Contract-First Development**: Design API before implementation
- **Generated Documentation**: Always in sync with code
- **Interactive Testing**: Swagger UI for manual testing
- **Type Safety**: Generated TypeScript client catches errors at compile time
- **Validation**: Automatic request/response validation
- **Discoverability**: Easy to explore API capabilities

---

## OpenAPI Specification Approach

### Strategy: Code-First with SpringDoc

**Why Code-First:**
- Existing API already implemented
- Gradual adoption without rewriting
- Annotations document code inline
- Automated spec generation from code

**Tool: SpringDoc OpenAPI**
- ✅ Spring Boot 3 compatible
- ✅ Auto-generates OpenAPI 3.x spec
- ✅ Integrated Swagger UI
- ✅ Supports Jakarta validation
- ✅ Works with Spring Security (future)
- ✅ Customizable with annotations

**Alternative (Future):** Spec-First
- Write OpenAPI YAML first
- Generate server stubs
- Implement against contract
- Better for greenfield projects

---

## Implementation Plan

### Phase 1: Setup SpringDoc (Week 1)

#### 1.1 Add Dependencies

**pom.xml:**
```xml
<dependencies>
    <!-- SpringDoc OpenAPI -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.3.0</version>
    </dependency>
    
    <!-- Validation annotations (already included) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

#### 1.2 Configure SpringDoc

**application.properties:**
```properties
# OpenAPI Configuration
springdoc.api-docs.path=/api/v1/api-docs
springdoc.swagger-ui.path=/api/v1/swagger-ui.html
springdoc.swagger-ui.enabled=true
springdoc.swagger-ui.operationsSorter=method
springdoc.swagger-ui.tagsSorter=alpha

# Show validation annotations in docs
springdoc.show-actuator=false
springdoc.model-and-view-allowed=false

# Package to scan for API controllers
springdoc.packages-to-scan=com.timeline.editor.controller

# Paths to match
springdoc.paths-to-match=/api/**
```

#### 1.3 Create OpenAPI Configuration Class

**OpenApiConfig.java:**
```java
package com.timeline.editor.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {
    
    @Bean
    public OpenAPI timelineEditorOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Timeline Data Editor API")
                .description("REST API for managing timeline events, reveals, and metadata")
                .version("1.0.0")
                .contact(new Contact()
                    .name("Timeline Editor Team")
                    .email("support@example.com"))
                .license(new License()
                    .name("MIT License")
                    .url("https://opensource.org/licenses/MIT")))
            .servers(List.of(
                new Server()
                    .url("http://localhost:8080")
                    .description("Development server"),
                new Server()
                    .url("http://localhost:8080/api")
                    .description("Development API")))
            .tags(List.of(
                new Tag().name("Events").description("Event management operations"),
                new Tag().name("Reveals").description("Reveal management operations"),
                new Tag().name("Timelines").description("Timeline management operations"),
                new Tag().name("Episodes").description("Episode management operations"),
                new Tag().name("Notes").description("Note management operations"),
                new Tag().name("Metadata").description("Dataset metadata operations"),
                new Tag().name("Export").description("Dataset export operations"),
                new Tag().name("Settings").description("Application settings"),
                new Tag().name("Schema").description("Schema introspection")
            ));
    }
}
```

#### Deliverables:
- SpringDoc dependency added
- Configuration in `application.properties`
- `OpenApiConfig.java` created
- Swagger UI accessible at `http://localhost:8080/api/v1/swagger-ui.html`
- OpenAPI JSON at `http://localhost:8080/api/v1/api-docs`

---

### Phase 2: API Standardization (Week 1-2)

#### 2.1 Endpoint Naming Convention

**Current Issues:**
- Inconsistent paths: `/api/tables/reveal` vs `/api/dataset/metadata`
- No clear versioning
- Unclear resource hierarchy

**Target Convention:**

```
/api/v1/{resource}
/api/v1/{resource}/{id}
/api/v1/{resource}/{id}/{subresource}
/api/v1/{resource}/{id}/{action}
```

**Proposed Endpoint Structure:**

| Current | Proposed | Resource |
|---------|----------|----------|
| `/api/tables/event` | `/api/v1/events` | Events |
| `/api/tables/reveal` | `/api/v1/reveals` | Reveals |
| `/api/tables/timeline` | `/api/v1/timelines` | Timelines |
| `/api/tables/episode` | `/api/v1/episodes` | Episodes |
| `/api/tables/note` | `/api/v1/notes` | Notes |
| `/api/tables/event-type` | `/api/v1/event-types` | Event Types |
| `/api/tables/event-tag` | `/api/v1/tags` | Tags |
| `/api/tables/soundtrack` | `/api/v1/soundtracks` | Soundtracks |
| `/api/tables/timeline-slice` | `/api/v1/timeline-slices` | Timeline Slices |
| `/api/dataset/metadata` | `/api/v1/metadata` | Metadata |
| `/api/dataset/export` | `/api/v1/export` | Export |
| `/api/settings` | `/api/v1/settings` | Settings |
| `/api/schema` | `/api/v1/schema` | Schema |

**Subresource Examples:**
```
GET    /api/v1/events/{id}/reveals          # Get all reveals for an event
POST   /api/v1/events/{id}/reveals          # Create reveal for event
GET    /api/v1/events/{id}/notes            # Get all notes for an event
POST   /api/v1/reveals/{id}/image           # Upload image for reveal
DELETE /api/v1/reveals/{id}/image           # Delete image for reveal
GET    /api/v1/reveals/{id}/image/{filename} # Get image
```

**Action Examples:**
```
POST   /api/v1/metadata/toggle-debug        # Toggle debug logging
POST   /api/v1/export/filesystem            # Export to filesystem
POST   /api/v1/soundtracks/reorder          # Reorder soundtracks
```

#### 2.2 Refactor Controller Mappings

**Example: RevealController**

**Before:**
```java
@RestController
@RequestMapping("/api/tables/reveal")
public class RevealController {
    @GetMapping
    public List<Reveal> getAllReveals() { ... }
}
```

**After:**
```java
@RestController
@RequestMapping("/api/v1/reveals")
@Tag(name = "Reveals", description = "Operations for managing reveals")
public class RevealController {
    
    @Operation(
        summary = "List all reveals",
        description = "Returns a list of all reveals, optionally filtered by search term"
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Successful operation",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RevealDTO.class),
                array = @ArraySchema(schema = @Schema(implementation = RevealDTO.class))
            )
        )
    })
    @GetMapping
    public List<RevealDTO> getAllReveals(
        @Parameter(description = "Search term to filter reveals")
        @RequestParam(value = "search", required = false) 
        String search
    ) {
        // Implementation
    }
}
```

#### Deliverables:
- All controllers updated with `/api/v1/{resource}` paths
- Old paths deprecated (with redirect or warning)
- Consistent naming across all endpoints

---

### Phase 3: Request/Response DTOs (Week 2-3)

**Note:** This phase coordinates with the DTO/Wire Protocol plan.

#### 3.1 Define Standard Response Wrappers

**Success Response:**
```java
@Schema(description = "Successful API response")
public class ApiResponse<T> {
    
    @Schema(description = "Response data", required = true)
    private T data;
    
    @Schema(description = "Response metadata")
    private ResponseMetadata metadata;
    
    // Constructors, getters, setters
}

@Schema(description = "Response metadata")
public class ResponseMetadata {
    
    @Schema(description = "Timestamp of response", example = "2024-03-15T10:30:00Z")
    private String timestamp;
    
    @Schema(description = "API version", example = "1.0.0")
    private String version;
    
    @Schema(description = "Request ID for tracing", example = "abc-123-def")
    private String requestId;
}
```

**Error Response:**
```java
@Schema(description = "Error response")
public class ErrorResponse {
    
    @Schema(description = "Error code", example = "REVEAL_NOT_FOUND")
    private String errorCode;
    
    @Schema(description = "Human-readable error message")
    private String message;
    
    @Schema(description = "Detailed error information")
    private String details;
    
    @Schema(description = "HTTP status code", example = "404")
    private int status;
    
    @Schema(description = "Timestamp of error")
    private String timestamp;
    
    @Schema(description = "Request path that caused error")
    private String path;
    
    @Schema(description = "Validation errors (if applicable)")
    private List<ValidationError> validationErrors;
}

@Schema(description = "Validation error detail")
public class ValidationError {
    
    @Schema(description = "Field that failed validation", example = "episodeTime")
    private String field;
    
    @Schema(description = "Validation error message", example = "must not be null")
    private String message;
    
    @Schema(description = "Rejected value", example = "null")
    private Object rejectedValue;
}
```

#### 3.2 Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            NotFoundException ex, 
            HttpServletRequest request) {
        
        ErrorResponse error = new ErrorResponse(
            "RESOURCE_NOT_FOUND",
            ex.getMessage(),
            "The requested resource does not exist",
            404,
            Instant.now().toString(),
            request.getRequestURI(),
            null
        );
        
        return ResponseEntity.status(404).body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        
        List<ValidationError> validationErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> new ValidationError(
                error.getField(),
                error.getDefaultMessage(),
                error.getRejectedValue()
            ))
            .collect(Collectors.toList());
        
        ErrorResponse error = new ErrorResponse(
            "VALIDATION_ERROR",
            "Request validation failed",
            "One or more fields have invalid values",
            400,
            Instant.now().toString(),
            request.getRequestURI(),
            validationErrors
        );
        
        return ResponseEntity.status(400).body(error);
    }
    
    // Other exception handlers...
}
```

#### Deliverables:
- Standard response wrapper classes
- Global exception handler
- Consistent error responses across all endpoints

---

### Phase 4: Controller Documentation (Week 3-4)

#### 4.1 Annotate Controllers

For each controller, add:
- `@Tag` - Group related endpoints
- `@Operation` - Describe what endpoint does
- `@ApiResponse` - Document possible responses
- `@Parameter` - Document path/query parameters
- `@RequestBody` - Document request body
- `@Schema` - Document DTO fields

#### Example: Complete RevealController

```java
@RestController
@RequestMapping("/api/v1/reveals")
@Tag(name = "Reveals", description = "Reveal management operations")
public class RevealController {
    
    @Autowired
    private RevealService revealService;
    
    // ========== LIST ==========
    
    @Operation(
        summary = "List reveals",
        description = "Returns a list of all reveals, optionally filtered by search term. " +
                     "Search matches against displayed title, description, and event description."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Successful operation",
            content = @Content(
                mediaType = "application/json",
                array = @ArraySchema(schema = @Schema(implementation = RevealDTO.class))
            )
        )
    })
    @GetMapping
    public List<RevealDTO> listReveals(
        @Parameter(
            description = "Search term to filter reveals",
            example = "grandmother"
        )
        @RequestParam(value = "search", required = false) 
        String search
    ) {
        return revealService.findAll(search);
    }
    
    // ========== GET BY ID ==========
    
    @Operation(
        summary = "Get reveal by ID",
        description = "Returns a single reveal by its unique identifier"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Reveal found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RevealDTO.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Reveal not found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @GetMapping("/{id}")
    public RevealDTO getReveal(
        @Parameter(description = "Reveal ID", required = true, example = "166")
        @PathVariable Long id
    ) {
        return revealService.findById(id);
    }
    
    // ========== CREATE ==========
    
    @Operation(
        summary = "Create reveal",
        description = "Creates a new reveal associated with an event and episode"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "201",
            description = "Reveal created successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RevealDTO.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request body",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Referenced event or episode not found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RevealDTO createReveal(
        @Parameter(description = "Reveal data", required = true)
        @Valid @RequestBody RevealCreateDTO createDTO
    ) {
        return revealService.create(createDTO);
    }
    
    // ========== UPDATE ==========
    
    @Operation(
        summary = "Update reveal",
        description = "Updates an existing reveal. Only provided fields are updated."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Reveal updated successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RevealDTO.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Reveal not found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request body",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @PutMapping("/{id}")
    public RevealDTO updateReveal(
        @Parameter(description = "Reveal ID", required = true, example = "166")
        @PathVariable Long id,
        
        @Parameter(description = "Updated reveal data", required = true)
        @Valid @RequestBody RevealUpdateDTO updateDTO
    ) {
        return revealService.update(id, updateDTO);
    }
    
    // ========== DELETE ==========
    
    @Operation(
        summary = "Delete reveal",
        description = "Permanently deletes a reveal and its associated screenshot"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "204",
            description = "Reveal deleted successfully"
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Reveal not found",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = ErrorResponse.class)
            )
        )
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReveal(
        @Parameter(description = "Reveal ID", required = true, example = "166")
        @PathVariable Long id
    ) {
        revealService.delete(id);
    }
    
    // ========== IMAGE OPERATIONS ==========
    
    @Operation(
        summary = "Upload reveal screenshot",
        description = "Uploads a screenshot image for a reveal. " +
                     "Maximum file size: 1MB. Supported formats: JPG, PNG, GIF, WebP."
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Image uploaded successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = String.class, example = "reveal-166.jpg")
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid file (empty, too large, or wrong format)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Reveal not found",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
        )
    })
    @PostMapping(
        value = "/{id}/image",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public String uploadImage(
        @Parameter(description = "Reveal ID", required = true)
        @PathVariable Long id,
        
        @Parameter(description = "Image file", required = true)
        @RequestParam("file") MultipartFile file
    ) {
        return revealService.uploadImage(id, file);
    }
    
    @Operation(
        summary = "Delete reveal screenshot",
        description = "Deletes the screenshot image associated with a reveal"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Image deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Reveal not found")
    })
    @DeleteMapping("/{id}/image")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteImage(
        @Parameter(description = "Reveal ID", required = true)
        @PathVariable Long id
    ) {
        revealService.deleteImage(id);
    }
    
    @Operation(
        summary = "Get reveal screenshot",
        description = "Returns the screenshot image for a reveal"
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Image found",
            content = @Content(mediaType = "image/jpeg")
        ),
        @ApiResponse(responseCode = "404", description = "Image not found")
    })
    @GetMapping("/{id}/image/{filename}")
    public ResponseEntity<Resource> getImage(
        @Parameter(description = "Reveal ID", required = true)
        @PathVariable Long id,
        
        @Parameter(description = "Image filename", required = true, example = "reveal-166.jpg")
        @PathVariable String filename
    ) {
        return revealService.getImage(id, filename);
    }
}
```

#### 4.2 Document DTOs with @Schema

```java
@Schema(description = "Reveal data transfer object")
public class RevealDTO {
    
    @Schema(description = "Unique identifier", example = "166", accessMode = AccessMode.READ_ONLY)
    private Long id;
    
    @Schema(description = "Associated event ID", example = "42", required = true)
    private Long eventId;
    
    @Schema(description = "Apparent timeline ID (for time travel scenarios)", example = "2")
    private Long apparentTimelineId;
    
    @Schema(description = "Episode ID", example = "14", required = true)
    private Long episodeId;
    
    @Schema(
        description = "Time position in episode (seconds)",
        example = "1979",
        required = true,
        minimum = "0"
    )
    private Integer episodeTime;
    
    @Schema(description = "Displayed date in narrative", example = "December 13, 2023")
    private String displayedDate;
    
    @Schema(description = "Displayed title of reveal", example = "Halmeoni gets dinner")
    private String displayedTitle;
    
    @Schema(description = "Detailed description of reveal")
    private String displayedDescription;
    
    @Schema(
        description = "Screenshot filename",
        example = "reveal-166.jpg",
        accessMode = AccessMode.READ_ONLY
    )
    private String screenshotFilename;
    
    @Schema(description = "Creation timestamp", accessMode = AccessMode.READ_ONLY)
    private String createdAt;
    
    @Schema(description = "Last update timestamp", accessMode = AccessMode.READ_ONLY)
    private String updatedAt;
    
    // Getters/setters
}
```

#### Deliverables:
- All controllers fully documented with OpenAPI annotations
- All DTOs documented with `@Schema` annotations
- Swagger UI reflects complete API documentation

---

### Phase 5: Validation (Week 4)

#### 5.1 Add Jakarta Validation Annotations

```java
@Schema(description = "Create reveal request")
public class RevealCreateDTO {
    
    @NotNull(message = "Event ID is required")
    @Schema(description = "Event ID", required = true, example = "42")
    private Long eventId;
    
    @NotNull(message = "Episode ID is required")
    @Schema(description = "Episode ID", required = true, example = "14")
    private Long episodeId;
    
    @NotNull(message = "Episode time is required")
    @Min(value = 0, message = "Episode time must be non-negative")
    @Schema(
        description = "Time in episode (seconds)",
        required = true,
        example = "1979",
        minimum = "0"
    )
    private Integer episodeTime;
    
    @Size(max = 255, message = "Displayed date must not exceed 255 characters")
    @Schema(description = "Displayed date", example = "December 13, 2023")
    private String displayedDate;
    
    @Size(max = 255, message = "Displayed title must not exceed 255 characters")
    @Schema(description = "Displayed title", example = "Halmeoni gets dinner")
    private String displayedTitle;
    
    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    @Schema(description = "Detailed description")
    private String displayedDescription;
    
    // Getters/setters
}
```

#### 5.2 Enable Validation in Controllers

```java
@PostMapping
@ResponseStatus(HttpStatus.CREATED)
public RevealDTO createReveal(
    @Valid @RequestBody RevealCreateDTO createDTO  // @Valid triggers validation
) {
    return revealService.create(createDTO);
}
```

#### 5.3 Validation Error Response

The `GlobalExceptionHandler` automatically converts validation errors to standardized error responses:

```json
{
  "errorCode": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": "One or more fields have invalid values",
  "status": 400,
  "timestamp": "2024-03-15T10:30:00Z",
  "path": "/api/v1/reveals",
  "validationErrors": [
    {
      "field": "episodeTime",
      "message": "must not be null",
      "rejectedValue": null
    },
    {
      "field": "displayedTitle",
      "message": "must not exceed 255 characters",
      "rejectedValue": "very long string..."
    }
  ]
}
```

#### Deliverables:
- All DTOs have validation annotations
- Controllers use `@Valid` for automatic validation
- Validation errors returned in standard format
- Swagger UI shows validation rules

---

### Phase 6: Client Generation (Week 5)

#### 6.1 Generate TypeScript Client

**Using openapi-generator-cli:**

```bash
# Install generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:8080/api/v1/api-docs \
  -g typescript-axios \
  -o frontend/src/api/generated \
  --additional-properties=supportsES6=true,npmVersion=10.0.0,typescriptThreePlus=true
```

**Generated Client Usage:**

```typescript
// frontend/src/api/client.ts
import { Configuration, RevealsApi, RevealDTO, RevealCreateDTO } from './generated';

const config = new Configuration({
  basePath: 'http://localhost:8080',
});

export const revealsApi = new RevealsApi(config);

// Usage in components
const reveals = await revealsApi.listReveals('grandmother');
const reveal = await revealsApi.getReveal(166);

const newReveal: RevealCreateDTO = {
  eventId: 42,
  episodeId: 14,
  episodeTime: 1979,
  displayedTitle: 'Halmeoni gets dinner',
};
const created = await revealsApi.createReveal(newReveal);
```

**Benefits:**
- ✅ Type-safe API calls (TypeScript knows all endpoints)
- ✅ Auto-complete for request/response objects
- ✅ Compile-time error checking
- ✅ Single source of truth (generated from OpenAPI spec)

#### 6.2 Add Generation Script

**package.json:**
```json
{
  "scripts": {
    "generate:api": "openapi-generator-cli generate -i http://localhost:8080/api/v1/api-docs -g typescript-axios -o src/api/generated",
    "generate:api:watch": "nodemon --watch 'http://localhost:8080/api/v1/api-docs' --exec 'npm run generate:api'"
  }
}
```

#### Deliverables:
- TypeScript client generated from OpenAPI spec
- Frontend updated to use generated client
- Documentation for regenerating client
- CI/CD pipeline step for client generation

---

### Phase 7: API Versioning (Week 5)

#### 7.1 Versioning Strategy

**URL Path Versioning (Recommended):**
```
/api/v1/reveals
/api/v2/reveals  (future)
```

**Pros:**
- ✅ Clear and explicit
- ✅ Easy to cache
- ✅ Easy to test (different URLs)
- ✅ Client can use multiple versions simultaneously

**Implementation:**

```java
// V1 Controller
@RestController
@RequestMapping("/api/v1/reveals")
public class RevealControllerV1 { ... }

// V2 Controller (future)
@RestController
@RequestMapping("/api/v2/reveals")
public class RevealControllerV2 { ... }
```

#### 7.2 Deprecation Strategy

When introducing breaking changes:

1. **Create new version** (`/api/v2/...`)
2. **Mark old version as deprecated** (OpenAPI annotations)
3. **Document migration path**
4. **Set sunset date** (6-12 months)
5. **Add deprecation headers** to responses
6. **Remove after sunset**

```java
@Operation(
    summary = "List reveals",
    deprecated = true,
    description = "⚠️ DEPRECATED: Use /api/v2/reveals instead. " +
                 "This endpoint will be removed on 2025-01-01."
)
@GetMapping
public List<RevealDTO> listReveals() {
    response.setHeader("Deprecation", "true");
    response.setHeader("Sunset", "Wed, 01 Jan 2025 00:00:00 GMT");
    response.setHeader("Link", "</api/v2/reveals>; rel=\"successor-version\"");
    // ...
}
```

#### Deliverables:
- V1 API established
- Versioning strategy documented
- Deprecation process defined

---

### Phase 8: Testing & Documentation (Week 6)

#### 8.1 Contract Testing

**Test that implementation matches OpenAPI spec:**

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
public class OpenApiContractTest {
    
    @LocalServerPort
    private int port;
    
    @Test
    public void validateAgainstOpenApiSpec() throws Exception {
        // Get OpenAPI spec
        String spec = RestAssured
            .given()
            .baseUri("http://localhost:" + port)
            .when()
            .get("/api/v1/api-docs")
            .then()
            .extract()
            .asString();
        
        OpenAPI openAPI = new OpenAPIV3Parser().readContents(spec).getOpenAPI();
        
        // Validate each endpoint
        openAPI.getPaths().forEach((path, pathItem) -> {
            pathItem.readOperations().forEach(operation -> {
                // Test that endpoint returns expected response
                // Test that request validation works
                // Test that error responses match spec
            });
        });
    }
}
```

#### 8.2 Swagger UI Testing

**Manual testing checklist:**
- [ ] All endpoints listed in Swagger UI
- [ ] Request examples work
- [ ] Response schemas accurate
- [ ] Error responses documented
- [ ] Authentication (if added) works
- [ ] File upload endpoints work

#### 8.3 Documentation

Create user-facing documentation:

**API_GUIDE.md:**
```markdown
# Timeline Editor API Guide

## Getting Started

### Base URL
```
http://localhost:8080/api/v1
```

### Interactive Documentation
Visit Swagger UI: http://localhost:8080/api/v1/swagger-ui.html

### Authentication
Currently no authentication required (single-user application).

## Common Operations

### List Events
```bash
curl http://localhost:8080/api/v1/events
```

### Create Reveal
```bash
curl -X POST http://localhost:8080/api/v1/reveals \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 42,
    "episodeId": 14,
    "episodeTime": 1979,
    "displayedTitle": "Halmeoni gets dinner"
  }'
```

### Search Reveals
```bash
curl "http://localhost:8080/api/v1/reveals?search=grandmother"
```

## Error Handling

All errors return standard format:
```json
{
  "errorCode": "RESOURCE_NOT_FOUND",
  "message": "Reveal not found",
  "status": 404,
  "timestamp": "2024-03-15T10:30:00Z"
}
```

## Rate Limiting
None (local application).

## Pagination
Not yet implemented (all endpoints return full results).
```

#### Deliverables:
- Contract tests passing
- Swagger UI fully functional
- User-facing API guide
- Developer integration guide

---

## Migration Strategy

### Transition Plan

**Phase 1: Dual Endpoints (2 weeks)**
- Keep old endpoints (`/api/tables/*`)
- Add new endpoints (`/api/v1/*`)
- Both point to same implementation
- Log usage to track adoption

**Phase 2: Frontend Migration (1 week)**
- Update frontend to use new endpoints
- Update frontend to use generated client
- Test thoroughly

**Phase 3: Deprecation (1 week)**
- Mark old endpoints as deprecated
- Add deprecation warnings in responses
- Update documentation

**Phase 4: Removal (After 1 month)**
- Remove old endpoint aliases
- Clean up routing configuration

### Backward Compatibility

**Option 1: URL Rewriting**
```java
@Configuration
public class LegacyApiConfig {
    
    @Bean
    public FilterRegistrationBean<LegacyApiFilter> legacyApiFilter() {
        FilterRegistrationBean<LegacyApiFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new LegacyApiFilter());
        registration.addUrlPatterns("/api/tables/*");
        return registration;
    }
}

public class LegacyApiFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        HttpServletRequest req = (HttpServletRequest) request;
        String oldPath = req.getRequestURI();
        String newPath = oldPath.replace("/api/tables/", "/api/v1/");
        
        // Forward to new endpoint
        request.getRequestDispatcher(newPath).forward(request, response);
    }
}
```

**Option 2: Controller Aliases**
```java
@RestController
public class RevealController {
    
    // New endpoint
    @GetMapping("/api/v1/reveals")
    public List<RevealDTO> listRevealsV1() {
        return listReveals();
    }
    
    // Legacy endpoint (temporary)
    @GetMapping("/api/tables/reveal")
    @Deprecated
    public List<RevealDTO> listRevealsLegacy() {
        return listReveals();
    }
    
    private List<RevealDTO> listReveals() {
        // Shared implementation
    }
}
```

---

## Success Criteria

### Technical Metrics

- [ ] OpenAPI 3.1 spec validates without errors
- [ ] All endpoints documented in Swagger UI
- [ ] 100% of endpoints have `@Operation` annotations
- [ ] 100% of DTOs have `@Schema` annotations
- [ ] TypeScript client generates without errors
- [ ] Contract tests pass for all endpoints
- [ ] No breaking changes to existing frontend during migration

### Quality Metrics

- [ ] All request/response examples work in Swagger UI
- [ ] All validation rules documented and tested
- [ ] Error responses consistent across all endpoints
- [ ] API response times within acceptable range (no degradation)

### Documentation Metrics

- [ ] API guide published and reviewed
- [ ] Migration guide for frontend developers
- [ ] Swagger UI accessible and functional
- [ ] Example requests/responses for common operations

---

## Tools and Resources

### SpringDoc OpenAPI

- **Documentation**: https://springdoc.org/
- **GitHub**: https://github.com/springdoc/springdoc-openapi
- **Examples**: https://github.com/springdoc/springdoc-openapi-demos

### OpenAPI Specification

- **Specification**: https://swagger.io/specification/
- **Guide**: https://learn.openapis.org/
- **Best Practices**: https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md

### Code Generation

- **OpenAPI Generator**: https://openapi-generator.tech/
- **TypeScript Axios**: https://openapi-generator.tech/docs/generators/typescript-axios/
- **CLI**: https://www.npmjs.com/package/@openapitools/openapi-generator-cli

### Validation

- **Jakarta Validation**: https://beanvalidation.org/3.0/
- **Hibernate Validator**: https://hibernate.org/validator/

---

## Timeline Summary

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| 1. Setup SpringDoc | Week 1 | Infrastructure | Swagger UI live |
| 2. API Standardization | Week 1-2 | Endpoint naming | Consistent URLs |
| 3. DTOs & Error Handling | Week 2-3 | Request/Response | Standard formats |
| 4. Documentation | Week 3-4 | Annotations | Complete OpenAPI spec |
| 5. Validation | Week 4 | Input validation | Jakarta Bean Validation |
| 6. Client Generation | Week 5 | TypeScript client | Generated API client |
| 7. Versioning | Week 5 | API versions | V1 established |
| 8. Testing & Docs | Week 6 | Quality | User guide |

**Total Estimated Time:** 6 weeks

---

## Conclusion

Implementing an OpenAPI specification will provide:

✅ **Single Source of Truth** - API contract in one place  
✅ **Auto-Generated Documentation** - Always in sync  
✅ **Type-Safe Client** - Generated TypeScript client  
✅ **Interactive Testing** - Swagger UI for manual tests  
✅ **Validation** - Automatic request/response validation  
✅ **Versioning** - Clear API evolution path  
✅ **Contract Testing** - Verify implementation matches spec  
✅ **Better DX** - Easier for frontend developers  

The investment in OpenAPI will significantly improve API quality, developer experience, and maintainability while enabling future features like authentication, rate limiting, and API monitoring.

