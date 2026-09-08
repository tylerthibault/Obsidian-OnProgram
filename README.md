# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

- **Phase 1 — Development Foundation:** complete and verified in Obsidian
- **Phase 2 — Work Item Data Model:** complete in code
- **Phase 3 — Work Item Management:** in progress
  - **Sprint 3.1 — Create Work Item:** complete
  - Sprint 3.2 — Quick Task Editor: next

The active branch is:

```text
phase-3-sprint-3-1-create-work-item
```

## Install / update the test vault

This repository should live at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Switch to the active branch and build it:

```bash
git fetch origin
git checkout phase-3-sprint-3-1-create-work-item
git pull
npm install
npm run build
```

For development watch mode:

```bash
npm run dev
```

## Current commands

The Command Palette includes:

- **OnProgram: Create task**
- **OnProgram: Scan work items**
- **OnProgram: Show diagnostics**
- **OnProgram: Test OnProgram**
- **OnProgram: Writer test: complete active work item**
- **OnProgram: Writer test: reopen active work item**

The writer-test commands are temporary development acceptance tools and will be replaced by normal task-management UI.

## Task creation

**OnProgram: Create task** opens a title modal, creates a Markdown task, initializes its required properties, and opens it.

Default destination:

```text
OnProgram/Tasks
```

The OnProgram settings tab now includes:

- **Task folder** — destination for newly created tasks
- **Task template** — optional vault-relative Markdown template
- **Default project** — optional project reference for new tasks
- **Debug mode**
- **Show startup notice**

New tasks always receive the mapped equivalents of:

```yaml
---
type: task
status: todo
---
```

If a Default project is configured, it is added as well.

Task creation never overwrites an existing note. Duplicate titles receive a numeric suffix such as `Task 2.md`.

See [`docs/task-creation.md`](docs/task-creation.md) for the complete creation contract and acceptance tests.

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

`src/main.ts` is intentionally a thin composition root. Feature code should live behind commands, services, views, models, or other focused modules instead of accumulating in the plugin entry point.

## Work-item pipeline

```text
Markdown file
    ↓
MetadataCache
    ↓
WorkItemParser
    ↓
normalized WorkItem
    ↓
canonical patch
    ↓
WorkItemWriter
    ↓
Markdown file
```

The central rule remains:

> Markdown files are the source of truth. OnProgram does not maintain a separate task database.

Technical specifications:

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)
- [`docs/work-item-writer.md`](docs/work-item-writer.md)
- [`docs/task-creation.md`](docs/task-creation.md)

## Data-safety guarantees already implemented

- ordinary notes without a work-item `type` are ignored;
- malformed work items are reported rather than silently discarded;
- date-only values remain timezone-free;
- unrelated frontmatter and Markdown body content survive writer operations;
- property mappings must be valid and one-to-one before writes;
- Milestone due dates and Event scheduled dates are protected as required fields;
- stale writes are refused if a source file changed after OnProgram parsed it;
- OnProgram serializes its own concurrent writes to the same file;
- task creation never overwrites an existing Markdown file.

## Sprint 3.1 manual acceptance test

1. Run **OnProgram: Create task**.
2. Enter `Test task`.
3. Confirm `OnProgram/Tasks/Test task.md` is created and opened.
4. Confirm it contains `type: task` and `status: todo`.
5. Run the command again using the same title.
6. Confirm `Test task 2.md` is created and the first task remains untouched.

Optional template/default-project tests are documented in `docs/task-creation.md`.

## Next sprint

**Sprint 3.2 — Quick Task Editor** will introduce a reusable task editor for status, project, priority, dates, scheduling, duration, notes, completion, and source-file access.
