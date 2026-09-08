# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

**Phase 1 — Development Foundation is complete and verified in Obsidian.**

**Phase 2 — Work Item Data Model is now complete in code.**

- **Sprint 2.1:** Work Item Schema — complete
- **Sprint 2.2:** Work Item Parser — complete
- **Sprint 2.3:** Work Item Writer — complete

The active Phase 2 branch is:

```text
phase-2-sprint-2-3-work-item-writer
```

## Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Switch to the active branch and install dependencies:

```bash
git fetch origin
git checkout phase-2-sprint-2-3-work-item-writer
npm install
npm run build
```

## Development workflow

Start esbuild in watch mode:

```bash
npm run dev
```

Changes under `src/` rebuild `main.js` automatically.

Run a production build with TypeScript validation:

```bash
npm run build
```

## Verify in Obsidian

Reload Obsidian and enable **OnProgram** under **Settings → Community plugins**.

The Command Palette should include:

- **OnProgram: Test OnProgram**
- **OnProgram: Show diagnostics**
- **OnProgram: Scan work items**
- **OnProgram: Writer test: complete active work item**
- **OnProgram: Writer test: reopen active work item**

The two writer-test commands intentionally modify the active work-item file and exist only as development acceptance commands for Sprint 2.3.

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

## Work Item Data Model

Phase 2 establishes the complete read/normalize/write foundation:

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

Detailed specifications:

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)
- [`docs/work-item-writer.md`](docs/work-item-writer.md)

## Parser behavior

- Files without the mapped `type` property are ignored.
- Files declaring a supported type are validated and normalized.
- Malformed candidates are reported rather than silently disappearing.
- Status casing and spaces/underscores are normalized.
- Missing priority resolves internally to `normal` without rewriting the file.
- Date-only values remain timezone-free.
- Durations normalize to minutes.
- Project, parent, and dependency references are validated.
- Parsing is read-only.

## Writer safety behavior

- Writes use Obsidian's `FileManager.processFrontMatter` API.
- Only canonical fields included in the patch are modified.
- Unrelated YAML and note body content are preserved.
- Optional properties are removed rather than written as empty values when cleared.
- Milestone `due` and Event `scheduled` cannot be removed.
- Status changes are validated against the current work-item type.
- Property mappings must be valid and one-to-one before any write occurs.
- Parsed work items carry the source file modification time.
- Stale writes are refused when the file changed after parsing.
- OnProgram serializes concurrent writes to the same file.

## Manual Phase 2 acceptance test

Create `Writer Test.md`:

```yaml
---
type: task
status: todo
priority: high
custom_field: PRESERVE ME
---

This body must survive every OnProgram write.
```

Run **OnProgram: Scan work items** and confirm the file is valid.

Then, with the file open, run:

**OnProgram: Writer test: complete active work item**

Expected:

- `status` becomes `done`;
- `completed` is added;
- `priority` is unchanged;
- `custom_field` is unchanged;
- the note body is unchanged.

Then run:

**OnProgram: Writer test: reopen active work item**

Expected:

- `status` returns to `todo`;
- `completed` is removed;
- unrelated YAML and body remain unchanged.

## Phase 2 completion gate

Phase 2 is complete when OnProgram can:

1. identify a work-item Markdown file;
2. normalize it into a typed internal model;
3. report malformed work-item files without modifying them;
4. safely update mapped properties;
5. preserve unrelated frontmatter and note content;
6. reject stale writes;
7. reparse the written file into the expected updated work item.

The next development phase is **Phase 3 — Work Item Management**, beginning with **Sprint 3.1 — Create Work Item**.
