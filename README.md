# OnProgram

OnProgram is an Obsidian work organizer built around Markdown files and native Obsidian Bases. Markdown remains the source of truth; OnProgram adds project, board, calendar, timeline, dashboard, publishing, and planning workflows on top of that data.

## Requirements

- Obsidian 1.10.2+
- Node.js 20+ for development
- Obsidian's Bases core plugin enabled

## Local development

Obsidian loads a community plugin from a folder whose name matches the plugin ID in `manifest.json`. OnProgram's plugin ID is `onprogram`, so the development checkout must be located at:

```text
<Vault>/.obsidian/plugins/onprogram/
```

The GitHub repository may still be named `Obsidian-OnProgram`; only the local plugin directory must be named `onprogram`.

If an existing checkout uses the repository name as the plugin directory, fully quit Obsidian before renaming it:

```bash
cd <Vault>/.obsidian/plugins
mv Obsidian-OnProgram onprogram
cd onprogram
```

Then install and build:

```bash
git fetch origin
git checkout dev
git pull
npm install
npm run build
```

For watch mode:

```bash
npm run dev
```

For a standalone type check:

```bash
npm run typecheck
```

After replacing `main.js`, fully reload Obsidian when validating plugin-load behavior. Toggling a plugin does not always invalidate every in-memory module path during development.

## Base workflow

Right-click a folder in Obsidian File Explorer and choose **OnProgram Base**.

For a folder named `Project Alpha`, OnProgram creates:

```text
Project Alpha/
├── Project Alpha.onprogram.base
└── Tasks/
```

The Base owns the query scope. Its OnProgram views operate over the same Markdown work items in `Tasks/`.

Current first-class views include:

- Dashboard
- Board
- Calendar
- Timeline
- Projects
- Inspector

Switching views changes the presentation, not the underlying Markdown data.

## Work items

OnProgram supports first-class Markdown work items including tasks, projects, milestones, and events. The property map is configurable, but a typical task uses frontmatter such as:

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
onprogram_base:
---
```

Creation services initialize the expected schema up front so the same note can move between OnProgram views without view-specific migrations.

## Linked Markdown instances

A single Markdown note can appear multiple times on the Scheduled Calendar without duplicating the note.

Each linked instance owns its own:

- stable instance ID
- date/time
- optional label
- optional duration

The linked note remains the source of truth for its content and frontmatter. Moving or resizing a linked Calendar instance changes the instance, not the source note.

This is intentionally generic. The same mechanism can represent TikTok, Instagram, a repost, a review, a reminder, a presentation, or any other repeated use of the same note.

See [Linked Markdown Instances](docs/LINKED_MARKDOWN_INSTANCES.md).

## Architecture

```text
Markdown files
    ↓
Obsidian Base query
    ↓
BasesWorkItemAdapter
    ↓
OnProgram domain models
    ↓
Views / interaction services
    ↓
WorkItemWriter + creation services
    ↓
Markdown files
```

Source layout:

```text
src/
├── commands/
├── components/
├── core/
├── models/
├── services/
│   ├── bases/
│   ├── calendar/
│   ├── links/
│   ├── presentation/
│   ├── projects/
│   ├── publishing/
│   └── work-items/
├── settings/
├── utils/
└── views/
```

The main architectural boundary is simple: domain models and persistence services own data semantics; views own presentation and interaction.

## Build and CI

`npm run build` performs a strict TypeScript check and then creates the production `main.js` bundle with esbuild.

CI runs on `main`, `dev`, phase branches, feature branches, fix branches, chore branches, and pull requests. Development branches may receive an automated `Build plugin bundle [skip ci]` commit when `main.js` changes.

## Technical documentation

- [Work-item schema](docs/work-item-schema.md)
- [Work-item parser](docs/work-item-parser.md)
- [Work-item writer](docs/work-item-writer.md)
- [Task creation](docs/task-creation.md)
- [Quick task editor](docs/quick-task-editor.md)
- [Bases integration](docs/bases-integration.md)
- [Folder-scoped Bases](docs/folder-scoped-bases.md)
- [Board view](docs/board-view.md)
- [Calendar view](docs/calendar-view.md)
- [Linked Markdown instances](docs/LINKED_MARKDOWN_INSTANCES.md)
- [Multi-platform publishing](docs/MULTI_PLATFORM_PUBLISHING_MASTER_PLAN.md)
