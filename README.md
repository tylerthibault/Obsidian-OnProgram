# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

**Phase 1 — Development Foundation is complete and verified in Obsidian.**

Development is now in **Phase 2 — Work Item Data Model**.

- **Sprint 2.1:** Work Item Schema — complete
- **Sprint 2.2:** Work Item Parser — active
- Sprint 2.3: Work Item Writer

The active branch is:

```text
phase-2-sprint-2-2-work-item-parser
```

## Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Switch to the active branch and install dependencies:

```bash
git fetch origin
git checkout phase-2-sprint-2-2-work-item-parser
npm install
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

The scan command is read-only. It reports how many Markdown files are valid work items, invalid work-item candidates, or ordinary ignored notes.

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

Sprint 2.1 establishes the canonical internal schema for Tasks, Projects, Milestones, Events, statuses, priorities, date semantics, relationships, and configurable property names.

Sprint 2.2 adds the read-only parsing pipeline:

```text
Markdown file
    ↓
MetadataCache
    ↓
WorkItemParser
    ↓
valid | invalid | ignored
```

The central rule remains:

> Markdown files are the source of truth. OnProgram views operate on normalized representations of those files; OnProgram does not create a separate task database.

Detailed specifications:

- [`docs/work-item-schema.md`](docs/work-item-schema.md)
- [`docs/work-item-parser.md`](docs/work-item-parser.md)

## Parser behavior

- Files without the mapped `type` property are ignored.
- Files declaring a supported type are validated and normalized.
- Files declaring a type but containing malformed required data are reported as invalid rather than silently disappearing.
- Status casing and spaces/underscores are normalized.
- Missing priority resolves internally to `normal` without rewriting the source file.
- Date-only values remain timezone-free.
- Durations normalize to minutes.
- Project, parent, and dependency references are validated.
- The scanner does not modify the vault.

## Manual Sprint 2.2 acceptance test

Create four Markdown files in the test vault.

### Valid Task

```yaml
---
type: task
status: In Progress
priority: HIGH
scheduled: 2026-09-08T13:30
duration: 1h 30m
---
```

### Valid Milestone

```yaml
---
type: milestone
status: planned
due: 2026-10-01
---
```

### Broken Event

```yaml
---
type: event
status: planned
---
```

### Ordinary Note

A normal Markdown note with no `type` property.

Run:

**OnProgram: Scan work items**

For only those four files, the expected result is:

```text
2 valid, 1 invalid, 1 ignored
```

See `docs/work-item-parser.md` for the full parser contract and test fixture.

## Sprint 2.2 completion criteria

Sprint 2.2 is complete when:

1. OnProgram detects candidate work-item Markdown files through the configured property map;
2. supported types, statuses, priorities, dates, durations, and references are normalized;
3. malformed candidates produce structured validation issues;
4. ordinary notes are safely ignored;
5. valid results carry backing-file source metadata;
6. the vault can be scanned read-only through Obsidian's MetadataCache;
7. the Command Palette exposes a scan command with a usable summary;
8. no parser action writes to Markdown files.
