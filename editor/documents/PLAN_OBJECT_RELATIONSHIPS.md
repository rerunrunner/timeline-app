# Object Relationships Refactoring Plan

## Current State Analysis

### Problem Statement

Currently, the backend domain models have a hybrid approach:
- ✅ JPA relationship objects are defined (`@ManyToOne`, `@ManyToMany`)
- ❌ Primitive foreign key IDs are still exposed as public fields
- ❌ Controllers and services primarily work with IDs rather than objects
- ❌ Serialization exposes IDs instead of nested objects

**Example from `Reveal.java`:**
```java
@Column(name = "event_id")
private Long eventId;  // ❌ Exposed primitive

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "event_id", insertable = false, updatable = false)
@JsonIgnore  // ❌ Hidden relationship
private Event event;
```

### Impact

1. **Code Duplication**: Services repeatedly fetch related objects by ID
2. **N+1 Query Problems**: Lazy loading triggers multiple database queries
3. **Domain Model Weakness**: Entities don't represent true object relationships
4. **Inconsistency**: Mixed paradigm confuses developers
5. **Testing Complexity**: Mock setup requires both IDs and objects

---

## Target State

### Object-First Domain Model

**Goals:**
- ✅ Relationships represented by objects, not IDs
- ✅ IDs only for serialization/deserialization boundaries
- ✅ Services work with objects, not primitive lookups
- ✅ Clear ownership and bidirectional relationships where appropriate
- ✅ Proper cascade and orphan removal semantics

**Example Target State for `Reveal.java`:**
```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "event_id", nullable = false)
private Event event;  // ✅ Primary relationship

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "apparent_timeline_id")
private Timeline apparentTimeline;  // ✅ Optional relationship

@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "episode_id", nullable = false)
private Episode episode;  // ✅ Required relationship

// IDs only exposed via relationships
public Long getEventId() {
    return event != null ? event.getId() : null;
}
```

---

## Entity Relationship Analysis

### Current Foreign Key Fields to Refactor

| Entity | FK Fields | Target Relationship | Cardinality | Required |
|--------|-----------|-------------------|-------------|----------|
| **Event** | `timelineId` | `timeline` | Many-to-One | Yes |
| | `eventTypeId` | `eventType` | Many-to-One | No |
| | `linkedEventId` | `linkedEvent` | Many-to-One | No |
| | `ostTrackId` | `soundtrack` | Many-to-One | No |
| **Reveal** | `eventId` | `event` | Many-to-One | Yes |
| | `apparentTimelineId` | `apparentTimeline` | Many-to-One | No |
| | `episodeId` | `episode` | Many-to-One | Yes |
| **Note** | `contextEventId` | `contextEvent` | Many-to-One | No |
| **TimelineSlice** | `timelineId` | `timeline` | Many-to-One | Yes |
| **Soundtrack** | (no FKs) | - | - | - |

### Bidirectional Relationships to Consider

Some relationships benefit from bidirectional navigation:

| Parent | Child | Relationship | Use Case |
|--------|-------|--------------|----------|
| **Event** | **Reveal** | One-to-Many | "Get all reveals for an event" |
| **Timeline** | **Event** | One-to-Many | "Get all events in a timeline" |
| **Episode** | **Reveal** | One-to-Many | "Get all reveals in an episode" |
| **Event** | **Note** | One-to-Many | "Get all notes about an event" |

**Recommendation:** Start with unidirectional (child → parent), add bidirectional only where querying patterns demonstrate need.

---

## Phased Implementation Plan

### Phase 1: Preparation (Week 1)

**Objective:** Set up infrastructure without breaking existing code.

#### Tasks:

1. **Audit Current Usage**
   - Grep for all `getId()` calls on foreign key fields
   - Identify all controller methods accepting/returning IDs
   - Document service layer ID-based lookups
   - Map fetch join patterns in repositories

2. **Create Utility Methods**
   - Add `getOrFetch()` helper methods to repositories
   - Create `EntityResolver` service for ID → object conversion
   - Add `@Transactional` boundaries where missing

3. **Add Integration Tests**
   - Test current behavior with IDs
   - Create test fixtures with both IDs and objects
   - Establish performance baselines

#### Deliverables:
- `OBJECT_RELATIONSHIPS_AUDIT.md` - usage report
- `EntityResolverService.java` - helper service
- Expanded test suite

---

### Phase 2: Entity Model Refactoring (Week 2-3)

**Objective:** Refactor entity models to use objects as primary fields.

#### ⚠️ Important: JSON Serialization Strategy

**During this phase, KEEP `@JsonIgnore` annotations!**

Since controllers currently return entities directly, we need to prevent:
- Circular reference errors (Event → Reveal → Event)
- Lazy loading exceptions during serialization
- Exposing too much data in API responses

**The `@JsonIgnore` will be removed later** when implementing DTOs (see coordination note below).

#### Pattern to Follow:

**Before:**
```java
@Entity
public class Reveal {
    @Column(name = "event_id")
    private Long eventId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", insertable = false, updatable = false)
    @JsonIgnore
    private Event event;
    
    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }
}
```

**After (Phase 2):**
```java
@Entity
public class Reveal {
    // Primary relationship - object field
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonIgnore  // ← KEEP THIS for now (removed when DTOs implemented)
    private Event event;
    
    // ID accessor (computed from relationship) - FOR JSON SERIALIZATION
    public Long getEventId() {
        return event != null ? event.getId() : null;
    }
    
    // Object accessors (primary interface for service layer)
    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }
}
```

**Note:** We **remove the ID setter** to enforce object-based relationships in service layer. Controllers will still work because they only call getters for serialization.

#### Refactoring Order:

1. **Simple Entities First**
   - `Timeline` (no foreign keys)
   - `Episode` (no foreign keys)
   - `EventType` (no foreign keys)
   - `EventTag` (no foreign keys)
   - `Soundtrack` (no foreign keys)

2. **Single Foreign Key Entities**
   - `Note` → `Event`
   - `TimelineSlice` → `Timeline`

3. **Multiple Foreign Key Entities**
   - `Event` → `Timeline`, `EventType`, `Soundtrack`, `Event` (linked)
   - `Reveal` → `Event`, `Episode`, `Timeline`

#### Entity-Specific Tasks:

**For each entity:**

1. Remove `insertable = false, updatable = false` from `@JoinColumn`
2. Remove `@JsonIgnore` from relationship fields (DTOs will handle serialization)
3. Add proper `fetch`, `optional`, `cascade` attributes
4. Convert ID getters to compute from relationship
5. Update ID setters to use `EntityManager.getReference()` or defer to service
6. Remove primitive ID fields entirely
7. Update constructors to accept objects instead of IDs

**Example for `Reveal.java`:**

```java
@Entity
@Table(name = "reveal")
public class Reveal extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // ========== RELATIONSHIPS ==========
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apparent_timeline_id")
    private Timeline apparentTimeline;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "episode_id", nullable = false)
    private Episode episode;
    
    // ========== PRIMITIVE FIELDS ==========
    
    @NotNull
    @Column(name = "episode_time")
    private Integer episodeTime;
    
    @Column(name = "displayed_date")
    private String displayedDate;
    
    @Column(name = "displayed_title")
    private String displayedTitle;
    
    @Column(name = "displayed_description")
    private String displayedDescription;
    
    @Column(name = "screenshot_filename")
    private String screenshotFilename;
    
    // ========== CONSTRUCTORS ==========
    
    public Reveal() {}
    
    public Reveal(Event event, Episode episode, Integer episodeTime) {
        this.event = event;
        this.episode = episode;
        this.episodeTime = episodeTime;
    }
    
    // ========== RELATIONSHIP ACCESSORS ==========
    
    public Event getEvent() { 
        return event; 
    }
    
    public void setEvent(Event event) { 
        this.event = event; 
    }
    
    public Timeline getApparentTimeline() { 
        return apparentTimeline; 
    }
    
    public void setApparentTimeline(Timeline apparentTimeline) { 
        this.apparentTimeline = apparentTimeline; 
    }
    
    public Episode getEpisode() { 
        return episode; 
    }
    
    public void setEpisode(Episode episode) { 
        this.episode = episode; 
    }
    
    // ========== ID ACCESSORS (for compatibility) ==========
    
    public Long getEventId() {
        return event != null ? event.getId() : null;
    }
    
    public Long getApparentTimelineId() {
        return apparentTimeline != null ? apparentTimeline.getId() : null;
    }
    
    public Long getEpisodeId() {
        return episode != null ? episode.getId() : null;
    }
    
    // ========== PRIMITIVE ACCESSORS ==========
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Integer getEpisodeTime() { return episodeTime; }
    public void setEpisodeTime(Integer episodeTime) { this.episodeTime = episodeTime; }
    
    public String getDisplayedDate() { return displayedDate; }
    public void setDisplayedDate(String displayedDate) { this.displayedDate = displayedDate; }
    
    public String getDisplayedTitle() { return displayedTitle; }
    public void setDisplayedTitle(String displayedTitle) { this.displayedTitle = displayedTitle; }
    
    public String getDisplayedDescription() { return displayedDescription; }
    public void setDisplayedDescription(String displayedDescription) { this.displayedDescription = displayedDescription; }
    
    public String getScreenshotFilename() { return screenshotFilename; }
    public void setScreenshotFilename(String screenshotFilename) { this.screenshotFilename = screenshotFilename; }
}
```

#### Deliverables:
- Refactored entity classes for all 11 models
- Updated unit tests for entity behavior
- Migration verification (no schema changes needed)

---

### Phase 3: Repository Layer Enhancement (Week 3-4)

**Objective:** Add fetch strategies and query methods that leverage relationships.

#### Tasks:

1. **Add Named Entity Graphs**
   - Define `@NamedEntityGraph` annotations for common fetch patterns
   - Create graph for "reveal with event and episode"
   - Create graph for "event with timeline and tags"

2. **Update Repository Methods**
   - Add `@EntityGraph` to query methods that need eager loading
   - Create specialized query methods for nested fetches
   - Remove manual ID-based join queries

3. **Optimize Fetch Strategies**
   - Analyze query logs for N+1 problems
   - Add batch fetching where appropriate
   - Use `@Fetch(FetchMode.SUBSELECT)` for collections

**Example: RevealRepository.java**

```java
@Repository
public interface RevealRepository extends JpaRepository<Reveal, Long> {
    
    // Default query - lazy loading
    List<Reveal> findAll();
    
    // Eager fetch specific relationships
    @EntityGraph(attributePaths = {"event", "episode", "apparentTimeline"})
    @Query("SELECT r FROM Reveal r WHERE r.event.id = :eventId")
    List<Reveal> findByEventIdWithRelations(@Param("eventId") Long eventId);
    
    // Fetch with deep graph
    @EntityGraph(attributePaths = {
        "event", 
        "event.timeline", 
        "event.tags",
        "episode",
        "apparentTimeline"
    })
    @Query("SELECT r FROM Reveal r")
    List<Reveal> findAllWithFullGraph();
    
    // Search using relationship fields
    @Query("SELECT r FROM Reveal r " +
           "WHERE r.event.shortDescription LIKE %:search% " +
           "OR r.displayedTitle LIKE %:search% " +
           "OR r.displayedDescription LIKE %:search%")
    List<Reveal> findBySearchTerm(@Param("search") String search);
}
```

#### Deliverables:
- Updated repository interfaces with entity graphs
- Query optimization report
- Performance comparison (before/after)

---

### Phase 4: Service Layer Refactoring (Week 4-5)

**Objective:** Update services to work with objects instead of IDs.

#### Current Pattern (ID-based):

```java
@Service
public class RevealService {
    
    @Autowired
    private RevealRepository revealRepository;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private EpisodeRepository episodeRepository;
    
    public Reveal createReveal(Long eventId, Long episodeId, Integer time) {
        // Manual lookups
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new NotFoundException("Event not found"));
        Episode episode = episodeRepository.findById(episodeId)
            .orElseThrow(() -> new NotFoundException("Episode not found"));
        
        Reveal reveal = new Reveal();
        reveal.setEventId(eventId);
        reveal.setEpisodeId(episodeId);
        reveal.setEpisodeTime(time);
        
        return revealRepository.save(reveal);
    }
}
```

#### Target Pattern (Object-based):

```java
@Service
public class RevealService {
    
    @Autowired
    private RevealRepository revealRepository;
    
    @Autowired
    private EventRepository eventRepository;
    
    @Autowired
    private EpisodeRepository episodeRepository;
    
    @Transactional
    public Reveal createReveal(Long eventId, Long episodeId, Integer time) {
        // Fetch objects (could be lazy proxies for performance)
        Event event = eventRepository.getReferenceById(eventId);
        Episode episode = episodeRepository.getReferenceById(episodeId);
        
        // Work with objects
        Reveal reveal = new Reveal(event, episode, time);
        
        return revealRepository.save(reveal);
    }
    
    // Alternative: Accept objects directly from controller/DTO layer
    @Transactional
    public Reveal createReveal(Event event, Episode episode, Integer time) {
        Reveal reveal = new Reveal(event, episode, time);
        return revealRepository.save(reveal);
    }
}
```

#### Service Refactoring Checklist:

For each service method:

- [ ] Replace `findById()` with `getReferenceById()` where appropriate
- [ ] Pass objects to entity constructors/setters instead of IDs
- [ ] Use relationship navigation instead of ID lookups
- [ ] Add `@Transactional` to methods that navigate lazy relationships
- [ ] Remove redundant ID-based queries
- [ ] Update exception handling for relationship navigation

#### Deliverables:
- Refactored service classes
- Updated service layer tests
- Transaction boundary documentation

---

### Phase 5: Controller Layer Update (Week 5-6)

**Objective:** Update controllers to work with DTOs (see DTO Plan) while services use objects.

**Note:** This phase coordinates with the DTO/Wire Protocol refactoring.

#### Current Pattern:

```java
@PutMapping("/{id}")
public ResponseEntity<Reveal> updateReveal(
        @PathVariable Long id, 
        @RequestBody Reveal revealDetails) {
    
    Optional<Reveal> optionalReveal = revealRepository.findById(id);
    if (optionalReveal.isPresent()) {
        Reveal reveal = optionalReveal.get();
        reveal.setEventId(revealDetails.getEventId());  // ❌ ID-based
        reveal.setEpisodeId(revealDetails.getEpisodeId());
        // ... etc
        return ResponseEntity.ok(revealRepository.save(reveal));
    }
    return ResponseEntity.notFound().build();
}
```

#### Target Pattern:

```java
@PutMapping("/{id}")
public ResponseEntity<RevealDTO> updateReveal(
        @PathVariable Long id, 
        @RequestBody RevealUpdateDTO updateDTO) {
    
    Reveal reveal = revealService.updateReveal(id, updateDTO);
    return ResponseEntity.ok(revealMapper.toDTO(reveal));
}

// In RevealService:
@Transactional
public Reveal updateReveal(Long id, RevealUpdateDTO updateDTO) {
    Reveal reveal = revealRepository.findById(id)
        .orElseThrow(() -> new NotFoundException("Reveal not found"));
    
    // Resolve IDs to objects
    if (updateDTO.getEventId() != null) {
        Event event = eventRepository.getReferenceById(updateDTO.getEventId());
        reveal.setEvent(event);
    }
    
    if (updateDTO.getEpisodeId() != null) {
        Episode episode = episodeRepository.getReferenceById(updateDTO.getEpisodeId());
        reveal.setEpisode(episode);
    }
    
    // Update primitives
    if (updateDTO.getEpisodeTime() != null) {
        reveal.setEpisodeTime(updateDTO.getEpisodeTime());
    }
    
    return revealRepository.save(reveal);
}
```

#### Deliverables:
- Updated controllers using DTOs
- Coordinated with DTO implementation plan
- Integration tests with real HTTP requests

---

### Phase 6: Bidirectional Relationships (Optional - Week 6)

**Objective:** Add parent → child navigation where beneficial.

#### Candidates:

**Event → Reveal (One-to-Many)**
```java
@Entity
public class Event {
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Reveal> reveals = new ArrayList<>();
    
    public void addReveal(Reveal reveal) {
        reveals.add(reveal);
        reveal.setEvent(this);
    }
    
    public void removeReveal(Reveal reveal) {
        reveals.remove(reveal);
        reveal.setEvent(null);
    }
}
```

**Timeline → Event (One-to-Many)**
```java
@Entity
public class Timeline {
    @OneToMany(mappedBy = "timeline", cascade = CascadeType.ALL)
    private List<Event> events = new ArrayList<>();
}
```

**Benefits:**
- Easier querying: `event.getReveals()` vs. `revealRepo.findByEventId()`
- Cascade operations: Deleting event cascades to reveals
- Domain model clarity: "An event has many reveals"

**Risks:**
- Serialization issues (infinite loops if not handled)
- Memory overhead (loading large collections)
- Cache invalidation complexity

**Recommendation:** Add only where:
1. Access pattern is common (`event.getReveals()` used frequently)
2. Cascade semantics make sense (delete parent → delete children)
3. Collection size is bounded (not thousands of children)

#### Deliverables:
- Selected bidirectional relationships implemented
- Updated cascade semantics
- Serialization handling verified

---

## Testing Strategy

### Unit Tests

**Entity Tests:**
- Test relationship getters/setters
- Test ID accessor computation
- Test cascade operations
- Test equals/hashCode with relationships

**Service Tests:**
- Test object-based method signatures
- Test lazy loading within transaction boundaries
- Test exception handling for missing references
- Test cascade behavior

### Integration Tests

**Repository Tests:**
- Test entity graph queries
- Test relationship navigation
- Test fetch optimization
- Compare query counts (before/after)

**Controller Tests:**
- Test DTO ↔ Entity mapping
- Test full request/response cycle
- Test relationship integrity across HTTP calls

### Performance Tests

**Benchmarks:**
- Query count per operation
- Response time for list operations
- Memory usage with relationships
- Lazy loading vs. eager loading tradeoffs

---

## Migration Strategy

### Backward Compatibility

**Transition Period Approach:**

1. **Dual Accessors**
   - Keep ID getters for compatibility
   - Add object setters as primary interface
   - Deprecate ID setters

2. **Gradual Rollout**
   - Phase 1: Internal refactoring (entities, services)
   - Phase 2: Controller/DTO layer update
   - Phase 3: Remove deprecated ID-based methods

3. **Feature Flags**
   - Add flag for "use object relationships"
   - Toggle in tests to verify both code paths
   - Remove flag after full rollout

### Database Impact

**No schema changes required!**

This is a code-level refactoring only. The database foreign key columns remain unchanged:
- `event_id` → `event` object (maps to same column)
- `episode_id` → `episode` object (maps to same column)

JPA handles the object ↔ column mapping transparently.

---

## Coordination with DTO Plan

### ⚠️ Critical: `@JsonIgnore` Handling

**During Object Relationships refactoring (THIS PLAN):**
- ✅ **KEEP** all `@JsonIgnore` annotations
- ✅ **KEEP** ID getters (for JSON serialization)
- ✅ Entities still returned directly from controllers
- ✅ API responses unchanged (backward compatible)

**After DTO implementation (NEXT PLAN):**
- ✅ Remove ALL `@JsonIgnore` annotations
- ✅ Remove ID getters (optional, computed in mappers)
- ✅ Entities become pure domain objects (never serialized)
- ✅ DTOs handle all JSON serialization

### Why Keep `@JsonIgnore` During Phase 2?

If you remove `@JsonIgnore` during Object Relationships refactoring **without** DTOs:

**❌ Problem 1: Circular References**
```java
Event { 
  id: 42,
  reveals: [
    Reveal { 
      id: 166, 
      event: { 
        id: 42, 
        reveals: [...] // ← Infinite loop!
      }
    }
  ]
}
```
Jackson throws: `JsonMappingException: Infinite recursion`

**❌ Problem 2: Lazy Loading Exceptions**
```java
GET /api/tables/reveal/166
→ Jackson serializes Reveal
→ Calls reveal.getEvent()
→ Hibernate proxy tries to load
→ LazyInitializationException: no Session
```

**❌ Problem 3: Massive Over-fetching**
```json
{
  "id": 166,
  "event": {
    "id": 42,
    "timeline": { "id": 1, "shortId": "TL1", ... },
    "eventType": { "id": 5, ... },
    "tags": [{ "id": 1, ... }, { "id": 2, ... }],
    "soundtrack": { "id": 3, ... }
  },
  "episode": { "id": 14, ... },
  "apparentTimeline": { "id": 2, ... }
}
// → 5KB response instead of 200 bytes!
```

### Recommended Implementation Order

**Option A: Sequential (Safer, Recommended)**

| Phase | Duration | `@JsonIgnore` Status | API Impact |
|-------|----------|---------------------|------------|
| 1. Object Relationships | 3 weeks | **KEEP** | No changes |
| 2. Basic DTOs | 2 weeks | **REMOVE** | Backward compatible |
| 3. OpenAPI + Advanced | 3 weeks | Removed | Enhanced |

**Total: 8 weeks**

**Option B: Overlap (Faster, Higher Risk)**

| Phase | Duration | Focus | API Impact |
|-------|----------|-------|------------|
| 1-2. Entities + DTOs | 4 weeks | Both in parallel | Changes at end |
| 3. OpenAPI | 2 weeks | Documentation | Enhanced |

**Total: 6 weeks** (but more complex coordination)

### Example: Entity During Transition

```java
@Entity
@Table(name = "reveal")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Reveal extends BaseEntity {
    
    // Object relationship (primary for service layer)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonIgnore  // ← TEMPORARY: Remove when DTOs in place
    private Event event;
    
    // ID getter (for current JSON serialization)
    // REMOVE when DTOs replace entities in controllers
    public Long getEventId() {
        return event != null ? event.getId() : null;
    }
    
    // Object getter (for service layer)
    public Event getEvent() { 
        return event; 
    }
    
    public void setEvent(Event event) { 
        this.event = event; 
    }
}
```

### When to Remove `@JsonIgnore`?

Remove `@JsonIgnore` annotations when:
1. ✅ All controllers updated to use DTOs
2. ✅ No controller directly returns entities
3. ✅ All responses go through mapper layer
4. ✅ Integration tests pass with new DTOs

Then:
```java
@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "event_id", nullable = false)
// @JsonIgnore ← REMOVED! Entity never serialized now
private Event event;
```

---

## Risks and Mitigations

### Risk 1: Performance Degradation (N+1 Queries)

**Mitigation:**
- Add entity graphs for common queries
- Use batch fetching for collections
- Monitor query logs in staging
- Add performance regression tests

### Risk 2: Lazy Loading Exceptions

**Mitigation:**
- Ensure proper `@Transactional` boundaries
- Use `@EntityGraph` for non-transactional contexts
- Add integration tests that catch LazyInitializationException
- Document fetch strategies

### Risk 3: Serialization Issues

**Mitigation:**
- Use DTOs for all controller responses (see DTO plan)
- Never serialize entities directly to JSON
- Add `@JsonIgnore` as temporary safeguard during transition
- Test serialization in integration tests

### Risk 4: Developer Learning Curve

**Mitigation:**
- Document object-first patterns with examples
- Code review checklist for relationship usage
- Pair programming during transition
- Team training session on JPA relationships

### Risk 5: Circular Dependencies in Relationships

**Mitigation:**
- Use unidirectional relationships by default
- Add bidirectional only where necessary
- Careful with cascade settings
- Test relationship cycles explicitly

---

## Success Criteria

### Code Quality Metrics

- [ ] Zero primitive foreign key fields in entities (except temporary IDs)
- [ ] 90%+ of service methods use objects instead of ID lookups
- [ ] All controllers use DTOs (no direct entity serialization)
- [ ] Entity graph coverage for all list endpoints
- [ ] No `insertable = false, updatable = false` in `@JoinColumn` annotations

### Performance Metrics

- [ ] No regression in response times (within 10%)
- [ ] Reduced query count for list operations (30%+ reduction target)
- [ ] No lazy loading exceptions in production
- [ ] Memory usage within acceptable bounds

### Code Clarity

- [ ] Relationships clearly expressed in domain model
- [ ] Reduced boilerplate in services (fewer manual lookups)
- [ ] Better test readability (setup uses objects, not IDs)
- [ ] Fewer null checks (relationships enforce nullability)

---

## Timeline Summary

| Phase | Duration | Focus | Deliverable |
|-------|----------|-------|-------------|
| 1. Preparation | Week 1 | Audit & Setup | Usage report, helper services |
| 2. Entity Refactoring | Week 2-3 | Models | 11 refactored entities |
| 3. Repository Enhancement | Week 3-4 | Data Access | Entity graphs, optimized queries |
| 4. Service Refactoring | Week 4-5 | Business Logic | Object-based services |
| 5. Controller Update | Week 5-6 | API Layer | DTO integration |
| 6. Bidirectional (Optional) | Week 6 | Advanced | Parent → child navigation |

**Total Estimated Time:** 5-6 weeks

---

## Resources and References

### JPA Best Practices

- **Hibernate Performance Tuning**: https://vladmihalcea.com/tutorials/hibernate/
- **Entity Graph Guide**: https://www.baeldung.com/jpa-entity-graph
- **Fetch Strategies**: https://thorben-janssen.com/entity-mappings-introduction-jpa-fetchtypes/

### Spring Data JPA

- **Repository Queries**: https://docs.spring.io/spring-data/jpa/docs/current/reference/html/
- **Projections vs DTOs**: https://www.baeldung.com/spring-data-jpa-projections

### Code Examples

See `examples/` directory for:
- Before/after comparison for each entity
- Service method refactoring examples
- Entity graph configuration patterns
- Common pitfalls and solutions

---

## Conclusion

This refactoring will significantly improve code quality:

✅ **Cleaner Domain Model** - Objects represent relationships  
✅ **Reduced Boilerplate** - Fewer manual ID lookups  
✅ **Better Performance** - Entity graphs eliminate N+1 queries  
✅ **Easier Testing** - Object-based fixtures, clearer assertions  
✅ **Future-Proof** - Proper foundation for complex features (like translations)  
✅ **No Schema Changes** - Pure code refactoring  

The investment in proper object relationships will pay dividends in maintainability and enable cleaner implementation of features like the upcoming translation system.

