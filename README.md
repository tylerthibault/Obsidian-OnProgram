# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. Markdown files remain the source of truth while OnProgram adds task-management and, later, board/calendar/timeline views over those same files.

## Current development status

- **Phase 1 — Development Foundation:** complete and verified in Obsidian
- **Phase 2 — Work Item Data Model:** complete
- **Phase 3 — Work Item Management:** complete in code
  - **Sprint 3.1 — Create Work Item:** complete
  - **Sprint 3.2 — Quick Task Editor:** complete
- **Phase 4 — Obsidian Bases Integration:** next

Active branch:

```text
phase-3-sprint-3-2-quick-task-editor
```

## Install / update the test vault

```bash
git fetch origin
git checkout phase-3-sprint-3-2-quick-task-editor
git pull
npm install
npm run build
```

For watch mode:

```bash
npm run dev
```

## Current commands

- **OnProgram: Create task**
- **OnProgram: Edit active work item**
- **OnProgram: Scan work items**
- **OnProgram: Show diagnostics**
- **OnProgram: Test OnProgram**
- temporary writer acceptance commands

## Work-item management

### Create

**Create task** creates a Markdown file in the configured task folder, optionally uses a template/default project, initializes mapped `type`/`status` properties, avoids filename collisions, and opens the new task.

### Edit

**Edit active work item** is available when the active Markdown file parses as a valid OnProgram work item. The reusable editor supports:

- Title / backing filename
- Status
- Project
- Priority
- Start
- Due
- Scheduled
- Duration
- Notes (the Markdown body)
- Open source file
- Archive
- Move to Trash

The editor refuses stale saves, checks rename collisions before mutation, preserves unrelated YAML, protects required schema dates, detects concurrent body edits, and uses Obsidian Trash rather than permanent deletion.

## Settings

- **Task folder** — destination for new tasks
- **Task template** — optional vault-relative Markdown template
- **Default project** — optional project reference for new tasks
- **Debug mode**
- **Show startup notice**

## Architecture

```text
src/
├── commands/
├── components/
├── core/
├── models/
│   └── work-item/
├── services/
│   └── work-items/
├── settings/
├── utils/
├── views/
└── main.ts
```

The core pipeline is:

```text
Markdown file
    ↓
MetadataCache
    ↓
WorkItemParser
    ↓
normalized WorkItem
    ↓
WorkItemWriter / WorkItemEditorService
    ↓
Markdown file
```

> Markdown files are the source of truth. OnProgram does not maintain a separate task database.

## Technical specifications

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)
- [`docs/work-item-writer.md`](docs/work-item-writer.md)
- [`docs/task-creation.md`](docs/task-creation.md)
- [`docs/quick-task-editor.md`](docs/quick-task-editor.md)

## Phase 3 acceptance test

1. Run **OnProgram: Create task** and create `Test task`.
2. Confirm the task is created and opened with `type: task` / `status: todo`.
3. Run **OnProgram: Edit active work item**.
4. Change the title, status, project, due date, duration, and Markdown Notes.
5. Save and confirm the same backing Markdown file (renamed if requested) contains the changes while unrelated YAML survives.
6. Reopen the editor and test Archive.
7. Separately create another task and confirm Move to Trash sends it through Obsidian Trash.

## Next phase

**Phase 4 — Obsidian Bases Integration** will add Base discovery, a unified work-item query layer, and live synchronization so Bases and future OnProgram views operate over the same source files.
