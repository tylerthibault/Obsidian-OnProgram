# OnProgram

OnProgram is an Obsidian work-organizer plugin built around Obsidian Bases. The long-term goal is to let the same underlying Markdown files be organized and manipulated through multiple work views such as boards, calendars, timelines, and planning views.

## Current development status

**Phase 1 — Development Foundation is complete and verified in Obsidian.**

Development is now in **Phase 2 — Work Item Data Model**.

- **Sprint 2.1:** Work Item Schema — active
- Sprint 2.2: Work Item Parser
- Sprint 2.3: Work Item Writer

The active branch is:

```text
phase-2-sprint-2-1-work-item-schema
```

## Install in the test vault

Clone or place this repository at:

```text
<Your Vault>/.obsidian/plugins/onprogram/
```

Switch to the active branch and install dependencies:

```bash
git fetch origin
git checkout phase-2-sprint-2-1-work-item-schema
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

OnProgram also has a settings tab with:

- **Debug mode** — enables verbose developer-console logging
- **Show startup notice** — controls the load notification

## Architecture

```text
src/
├── commands/
├── components/
├── core/
├── models/
│   └── work-item/
├── services/
├── settings/
├── utils/
├── views/
└── main.ts
```

`src/main.ts` is intentionally a thin composition root. Feature code should live behind commands, services, views, models, or other focused modules instead of accumulating in the plugin entry point.

## Work Item Schema

Sprint 2.1 establishes a canonical internal schema for:

- Tasks
- Projects
- Milestones
- Events
- statuses
- priorities
- date semantics
- relationships and dependencies
- property-name mapping
- required versus optional properties

The full specification is documented in [`docs/work-item-schema.md`](docs/work-item-schema.md).

The central rule remains:

> Markdown files are the source of truth. OnProgram views operate on normalized representations of those files; OnProgram does not create a separate task database.

Default YAML property names are only defaults. The plugin settings model already carries a canonical-to-vault property map so later parser and writer code do not need to hard-code names such as `status`, `due`, or `scheduled`.

## Phase 2 architecture rules

1. A due date is a deadline; it is not automatically a scheduled work block.
2. `scheduled` is the primary calendar-placement concept.
3. Canonical domain fields are separate from the vault's physical YAML property names.
4. Valid WorkItem objects are normalized domain objects, not arbitrary frontmatter dictionaries.
5. Malformed or incomplete source files must be reported without destructive rewriting.
6. Missing optional properties should normally remain absent instead of being written as empty YAML fields.
7. Schema evolution must be explicit and versioned.

## Sprint 2.1 completion criteria

Sprint 2.1 is complete when:

1. Task, Project, Milestone, and Event are defined as canonical work-item types;
2. canonical statuses and valid status subsets are defined;
3. priority values, ordering, and missing-priority behavior are defined;
4. date fields have distinct documented semantics;
5. default YAML property names and a configurable property-map contract exist;
6. required versus optional fields are explicit for every work-item type;
7. TypeScript domain models represent valid normalized work items;
8. the schema is documented independently of the parser and UI.
