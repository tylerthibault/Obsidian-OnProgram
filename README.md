# OnProgram

OnProgram is an Obsidian work-organizer built on Markdown files and Obsidian Bases. Markdown remains the source of truth; an OnProgram Base provides the query boundary and Board, Calendar, and Timeline views over those files.

## Current development status

- **Phase 1 — Development Foundation:** complete and verified in Obsidian
- **Phase 2 — Work Item Data Model:** complete
- **Phase 3 — Work Item Management:** complete
- **Phase 4 — Obsidian Bases Integration:** complete
- **Phase 5 — Board View:** complete in code
- **Phase 6 — Calendar System:** complete in code
- **Phase 7 — Timeline View:** core implementation complete in code
- **Folder-scoped Base workflow:** active integration/QA branch

Active branch:

```text
feature-folder-scoped-onprogram-base
```

## Install / update the test vault

```bash
git fetch origin
git checkout feature-folder-scoped-onprogram-base
git pull
npm install
npm run build
```

For watch mode:

```bash
npm run dev
```

OnProgram currently requires Obsidian **1.10.2+** because folder-scoped Bases use public Bases custom-view configuration APIs introduced in that release.

## Primary workflow: a folder owns its OnProgram Base

Right-click a folder in Obsidian File Explorer and choose **Create OnProgram base**.

For a folder named `Project Alpha`, OnProgram creates:

```text
Project Alpha/
├── Project Alpha.onprogram.base
└── files/
```

The generated Base is filtered to Markdown files in `Project Alpha/files/` and is created with:

- **Board**
- **Calendar**
- **Timeline**

Switching views never changes the source dataset. They are different representations of the same Markdown files.

Tasks created from these OnProgram views are routed back into that Base's own `files/` directory. The global **OnProgram: Create task** command also uses the active Base's folder when the Base itself—or one of its task files—is active.

See [`docs/folder-scoped-bases.md`](docs/folder-scoped-bases.md).

## Full schema at task creation

New task files receive the complete OnProgram property set immediately rather than waiting for a particular view to need a property.

With default mappings:

```yaml
---
type: task
status: todo
project:
priority: normal
start:
end:
due:
scheduled:
duration:
completed:
parent:
depends_on: []
---
```

That lets the same file move between Board, Calendar, Timeline, and future views without schema migration just to add missing fields.

## Bases-native architecture

```text
Project Alpha/files/*.md
    ↓
Obsidian Base filter / sort / formulas / grouping
    ↓
BasesQueryResult
    ↓
BasesWorkItemAdapter
    ↓
OnProgram WorkItems
    ↓
┌─────────┬──────────┬──────────┐
│  Board  │ Calendar │ Timeline │
└─────────┴──────────┴──────────┘
    ↓
WorkItemWriter
    ↓
Project Alpha/files/*.md
```

There is no separate OnProgram task database.

## Board

The Bases-native Board groups cards by canonical status. Dragging a card validates the target status and writes the mapped Markdown `status` property through `WorkItemWriter`. Card ordering follows the Base's own query/sort order.

Board also provides **+ New task**, which creates the backing file in that Base's configured `files/` directory.

See [`docs/board-view.md`](docs/board-view.md).

## Calendar

One Bases-native Calendar view switches between Month, Week, and Day. The active date field can be `scheduled`, `due`, or `start`.

Current capabilities include navigation, Today, all-day/timed placement, direct task creation from calendar cells, drag/drop rescheduling, and an unscheduled-work tray. Calendar-created files go to the current Base's `files/` folder.

See [`docs/calendar-view.md`](docs/calendar-view.md).

## Timeline

The Bases-native Timeline supports:

- start/end ranges
- start/due ranges
- milestone and single-date points
- project grouping
- Day / Week / Month / Quarter zoom
- automatic bounds
- Today marker
- draggable ranges and points
- left/right range resize handles
- safe date writes through `WorkItemWriter`
- unscheduled work visibility
- Base-scoped **+ New task** creation

## Current commands

- **OnProgram: Create task**
- **OnProgram: Edit active work item**
- **OnProgram: Scan work items**
- **OnProgram: Show diagnostics**
- **OnProgram: Test OnProgram**
- temporary writer acceptance commands

## Work-item management

**Create task** is context-aware. Inside a folder-scoped OnProgram Base it uses that Base's `files/` directory; outside a Base context it falls back to the global task-folder setting.

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
│   ├── calendar/
│   └── timeline/
└── main.ts
```

> Markdown files are the source of truth. The folder owns the Base. The Base owns the query scope. OnProgram views manipulate the same backing files.

## Technical specifications

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)
- [`docs/work-item-writer.md`](docs/work-item-writer.md)
- [`docs/task-creation.md`](docs/task-creation.md)
- [`docs/quick-task-editor.md`](docs/quick-task-editor.md)
- [`docs/bases-integration.md`](docs/bases-integration.md)
- [`docs/folder-scoped-bases.md`](docs/folder-scoped-bases.md)
- [`docs/board-view.md`](docs/board-view.md)
- [`docs/calendar-view.md`](docs/calendar-view.md)

## Immediate acceptance gate

The current branch should be tested in a clean vault by creating two project folders, creating an OnProgram Base in each, and confirming task creation/isolation under each folder's `files/` directory. The full test procedure is in `docs/folder-scoped-bases.md`.

Once that gate passes, development continues from the completed multi-view core into the OnProgram Today / dashboard phase.
