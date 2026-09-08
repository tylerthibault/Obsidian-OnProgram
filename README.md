# OnProgram

OnProgram is an Obsidian work-organizer built on Markdown files and Obsidian Bases. Markdown remains the source of truth while Bases supplies the query/filter host for OnProgram views.

## Current development status

- **Phase 1 — Development Foundation:** complete and verified in Obsidian
- **Phase 2 — Work Item Data Model:** complete
- **Phase 3 — Work Item Management:** complete
- **Phase 4 — Obsidian Bases Integration:** complete in code
- **Phase 5 — Board View:** next, with preference for Obsidian's native Bases Kanban capability

Active branch:

```text
phase-4-sprint-4-1-bases-integration
```

## Install / update the test vault

```bash
git fetch origin
git checkout phase-4-sprint-4-1-bases-integration
git pull
npm install
npm run build
```

For watch mode:

```bash
npm run dev
```

## Native Bases integration

OnProgram registers a native Bases view named **OnProgram** through Obsidian's public Bases API.

Inside a Base, choose **OnProgram** as the view type. The current foundation renderer shows the Base-selected files after the Base has already applied its filters, sorting, grouping, formulas, and limits.

Those entries are then normalized through the same `WorkItemParser` used elsewhere in the plugin.

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
OnProgram Bases view
```

The view refreshes through `BasesView.onDataUpdated()` whenever Obsidian supplies new query results.

See [`docs/bases-integration.md`](docs/bases-integration.md).

## Current commands

- **OnProgram: Create task**
- **OnProgram: Edit active work item**
- **OnProgram: Scan work items**
- **OnProgram: Show diagnostics**
- **OnProgram: Test OnProgram**
- temporary writer acceptance commands

## Work-item management

**Create task** creates a safe Markdown task in the configured task folder, optionally using a template/default project.

**Edit active work item** supports title/rename, status, project, priority, dates, duration, Markdown-body Notes, archive, source opening, and Move to Trash while preserving unrelated frontmatter and rejecting stale writes.

## Settings

- **Task folder**
- **Task template**
- **Default project**
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
│   ├── bases/
│   └── work-items/
├── settings/
├── utils/
├── views/
│   └── bases/
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

## Phase 4 acceptance test

1. Enable Obsidian Bases.
2. Create a Base containing OnProgram task files.
3. Add a Base filter such as `status != done`.
4. Add/switch a view and select **OnProgram**.
5. Confirm only the Base result rows are represented.
6. Confirm valid work items, invalid candidates, and ordinary notes are distinguished.
7. Change a task so it enters or leaves the Base filter.
8. Confirm the OnProgram view refreshes as the Base query updates.

## Next phase

Phase 5 will validate OnProgram's work-item semantics with the native Bases Kanban workflow rather than automatically creating a second competing board implementation. Calendar and Timeline will then be added as Bases-native OnProgram view types.
