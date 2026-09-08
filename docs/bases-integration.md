# Native Obsidian Bases Integration

## Architectural decision

OnProgram integrates with Obsidian Bases by registering native custom Bases view types through `Plugin.registerBasesView()`.

This replaces the original idea of separately parsing `.base` files and reproducing their filter/query behavior.

```text
Obsidian Base
    ↓
Base filters / formulas / sorting / grouping / limit
    ↓
BasesQueryResult
    ↓
BasesWorkItemAdapter
    ↓
OnProgram WorkItems
    ↓
OnProgram Bases-native view
```

## Why this is preferable

Obsidian remains responsible for:

- which files belong to the Base;
- Base filters;
- formulas;
- sorting;
- grouping;
- limits;
- property visibility;
- query refresh when vault data changes.

OnProgram remains responsible for:

- identifying which returned files are OnProgram work items;
- validating and normalizing their work-item properties;
- rendering work-oriented views;
- writing changes safely back to Markdown files.

This preserves the product rule that Markdown files are the source of truth and makes Bases the query/view host rather than introducing a parallel OnProgram database.

## Sprint 4.1 — Native view registration

OnProgram registers the view ID:

```text
onprogram
```

with the display name **OnProgram** and a compass icon.

When Bases are enabled, an OnProgram view can be selected from the Base's view-type UI.

The initial view is intentionally an inspector/foundation renderer. It displays:

- number of Base result rows;
- number of valid OnProgram work items;
- invalid work-item candidates;
- ordinary notes ignored by the work-item schema;
- visible Base properties;
- number of Base groups;
- normalized work-item type/status/priority/project;
- links back to the source Markdown files.

## Sprint 4.2 — Unified Base query adapter

`BasesWorkItemAdapter` consumes `BasesQueryResult` directly.

For every `BasesEntry`, it:

1. takes the backing `TFile` selected by the Base;
2. reads its current frontmatter through `MetadataCache`;
3. passes it through `WorkItemParser`;
4. returns valid WorkItems, invalid candidates, and ignored ordinary notes.

It also adapts `groupedData`, preserving the Base's group boundaries for views that need them.

### Important consequence

OnProgram does not need a second implementation of status/project/date/priority/tag/folder filters merely to match a Base. Users can configure those filters in the Base itself, and OnProgram receives the already-filtered result.

OnProgram-specific view options may still add presentation-level filtering later, but they should not replace the Base query engine.

## Sprint 4.3 — Live synchronization

`BasesView.onDataUpdated()` is called by Obsidian when the Base query has new data.

Every OnProgram Bases-native view therefore re-renders from a fresh `BasesQueryResult` rather than holding a stale result reference.

The flow is:

```text
Markdown property changes
        ↓
Obsidian MetadataCache / Bases query refresh
        ↓
BasesView.onDataUpdated()
        ↓
BasesWorkItemAdapter
        ↓
Fresh WorkItems
        ↓
View re-render
```

And writes flow in the other direction:

```text
OnProgram interaction
        ↓
WorkItemWriter
        ↓
Markdown frontmatter
        ↓
Bases refresh
        ↓
onDataUpdated()
```

## Manual acceptance test

1. Enable the Obsidian Bases core plugin.
2. Create a Base containing the `OnProgram/Tasks` folder or another set of work-item notes.
3. Add Base filters, such as `status != done`.
4. Add or switch a view and choose **OnProgram** as the view type.
5. Confirm the OnProgram view only displays files returned by the Base filter.
6. Change a task's status in its Markdown properties so it no longer matches the Base filter.
7. Confirm the OnProgram view updates through the Bases refresh lifecycle.
8. Change grouping or visible properties in the Base and confirm the OnProgram inspector reflects the new result/group/property metadata.

## Phase 4 gate

Phase 4 is complete when:

- OnProgram is available as a native Bases view;
- OnProgram receives the Base-selected result set rather than scanning an unrelated source;
- Base filters/sorting/grouping/limits are respected by construction;
- Base entries normalize through the existing work-item parser;
- malformed candidates remain visible as validation problems;
- source notes can be opened from the view;
- Base data refreshes cause OnProgram to re-render through `onDataUpdated()`.

## Impact on later phases

Later visualizations should be implemented as distinct Bases-native view registrations:

```text
onprogram-calendar
onprogram-timeline
onprogram-today   (if a Base-hosted version is useful)
```

Obsidian's native Bases Kanban view should be preferred over rebuilding a competing board renderer when it can satisfy the required workflow. OnProgram should focus on safe work-item semantics and the missing views/behaviors.
