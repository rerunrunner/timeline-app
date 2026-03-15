# Timeline Data Editor - Future Improvements

This document tracks planned improvements and enhancements for the Timeline Data Editor project.

## Priority Improvements

### 1. **Tag Categories** 🏷️
- **Core Story Events** - Filter for timeslips, deaths, major plot points
- **Music** - Soundtrack-related tags  
- **Important Elements** - Key story elements
- **Custom Categories** - User-defined tag groupings
- **Filtering UI** - Ability to filter events by tag categories

### 2. **Relative Timing** ⏰
- **Narrative Date Calculations** - "narrative date + 1 day", "same day + 2 hours"
- **Displayed Date Calculations** - Similar relative timing for displayed dates
- **Formula Support** - Maybe something like `{event.narrativeDate} + 1 day`
- **Auto-calculation** - Events automatically update when referenced events change

### 3. **Rich Text Editing** ✏️
- ✅ **Clickable Links** - Click on `@event` mentions to navigate to that event
- ✅ **Visual Tags** - Mentions display as styled clickable tags showing event descriptions
- ✅ **Navigation** - Clicking tags clears search filter and scrolls to the referenced event
- ✅ **Atomic Tokens** - Mentions behave as single units (delete removes entire token)
- ✅ **Dropdown Integration** - Type `@` to show mention dropdown with event search
- ✅ **Keyboard Navigation** - Arrow keys, Enter, Escape for dropdown interaction
- ✅ **Undo Stack Integration** - Mentions work properly with browser undo/redo
- ✅ **Token Selection** - Cmd+A selects all content including mentions
- ✅ **Token Recovery** - Loads saved `@event-{id}` content and converts to styled tokens
- ✅ **Token Validation** - Graceful fallback for mentions referencing deleted events
- ✅ **Card Expansion** - Clicking mentions automatically expands target event cards
- **Link Persistence** - Rename events without breaking existing links
- **Rich Formatting** - Bold, italic, maybe even embedded images
- **Link Preview** - Hover over mentions to see event details

### 4. **Technical Debt** 🔧
- **Entity Relationships** - The `Reveal.episode` relationship isn't being set properly
- **JPA Lifecycle Callbacks** - Some entities might not be triggering version updates consistently
- **Semantic ID Generation** - Could be more robust for event renaming

### 5. **UI/UX Improvements** 🎨
- **Better Navigation** - Quick jump between related events
- **Search & Filter** - More advanced search capabilities
- **Keyboard Shortcuts** - Power user features

## Completed Features

### ✅ **Core Functionality**
- Dataset metadata with automatic versioning
- WebSocket real-time updates
- Export functionality (download + filesystem)
- Image export with ZIP support
- Complete @mention system with atomic tokens
- Rich text editor with full mention functionality
- Semantic IDs in exports
- Filesystem export with cleanup

### ✅ **Technical Implementation**
- JPA lifecycle callbacks for version updates
- Global CORS configuration
- Entity relationship management
- Auto-save behavior in text editors
- Complete mention system with atomic token behavior
- ContentEditable integration with React event handling
- Token serialization/deserialization for database persistence
- Browser undo/redo stack integration for mentions

## Notes

- This project serves as a **data editor** that feeds into a separate timeline viewer
- Focus should be on making the data editing experience smooth and powerful
- Performance optimizations are not a priority
- Export enhancements, timeline visualization, and data management features are not needed

---

*Last updated: January 19, 2025*
