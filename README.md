# OnProgram

OnProgram is an Obsidian work-organizer built on Markdown files and Obsidian Bases. Markdown remains the source of truth while Bases supplies the query/filter host for OnProgram views.

## Current development status

- **Phase 1 — Development Foundation:** complete and verified in Obsidian
- **Phase 2 — Work Item Data Model:** complete
- **Phase 3 — Work Item Management:** complete
- **Phase 4 — Obsidian Bases Integration:** complete
- **Phase 5 — Board View:** complete in code
- **Phase 6 — Calendar System:** complete in code
- **Phase 7 — Timeline View:** next

Active branch: `phase-6-calendar-system`.

## Install / update the test vault

```bash
git fetch origin
git checkout phase-6-calendar-system
git pull
npm install
npm run build
```

For watch mode: `npm run dev`.

## Bases-native views

OnProgram currently registers **OnProgram Inspector**, **OnProgram Board**, and **OnProgram Calendar**. All consume the Base's actual filtered/sorted result set rather than a separate task database.

```text
Obsidian Base
    ↓
filters / formulas / sorting / grouping / limit
    ↓
BasesQueryResult
    ↓
BasesWorkItemAdapter
    ↓
OnProgram WorkItems
    ↓
Board / Calendar / future Timeline
```

## Board

The Board groups cards by canonical status. Dragging a card validates the destination and writes the mapped Markdown `status` property through `WorkItemWriter`. Card ordering follows the Base sort. See [`docs/board-view.md`](docs/board-view.md).

## Calendar

One Calendar view switches between Month, Week, and Day. The active date field can be `scheduled`, `due`, or `start`. It supports navigation, Today, date-only/timed placement, direct task creation from cells, drag/drop rescheduling, and an unscheduled-work tray. See [`docs/calendar-view.md`](docs/calendar-view.md).

## Current commands

- **OnProgram: Create task**
- **OnProgram: Edit active work item**
- **OnProgram: Scan work items**
- **OnProgram: Show diagnostics**
- **OnProgram: Test OnProgram**
- temporary writer acceptance commands

## Work-item management

**Create task** creates a safe Markdown task in the configured folder, optionally using a template/default project. Calendar can also supply the initial `scheduled`, `due`, or `start` date during creation.

**Edit active work item** supports title/rename, status, project, priority, dates, duration, Markdown-body Notes, archive, source opening, and Move to Trash while preserving unrelated frontmatter and rejecting stale writes.

## Architecture

```text
src/
├── commands/
├── components/
├── core/
├── models/
│   └── work-item/
├── services/
│   ├── bases/
│   └── work-items/
├── settings/
├── utils/
├── views/
│   ├── bases/
│   └── calendar/
└── main.ts
```

> Markdown files are the source of truth. Bases is the query/view host. OnProgram does not maintain a separate task database.

## Technical specifications

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)
- [`docs/work-item-writer.md`](docs/work-item-writer.md)
- [`docs/task-creation.md`](docs/task-creation.md)
- [`docs/quick-task-editor.md`](docs/quick-task-editor.md)
- [`docs/bases-integration.md`](docs/bases-integration.md)
- [`docs/board-view.md`](docs/board-view.md)
- [`docs/calendar-view.md`](docs/calendar-view.md)

## Next phase

**Phase 7 — Timeline View** will add a Bases-native horizontal project timeline with start/end ranges, milestone points, project grouping, zoom levels, Today marker, and direct date manipulation.
