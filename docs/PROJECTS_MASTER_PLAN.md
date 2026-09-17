# OnProgram Projects — Master Plan

## Goal

Projects add a first-class layer above individual tasks while keeping Markdown as the source of truth. A project is a normal Markdown work item with `type: project`. Tasks continue to use the canonical `project` property to associate themselves with a project.

The Projects view is a rollup, not a second database. Progress, task counts, due information, and project state are derived from the same work items already visible to the current Obsidian Base.

## V1 scope

### Project work items

A project is stored as Markdown frontmatter, for example:

```yaml
type: project
status: planned
priority: normal
due:
onprogram_base:
```

Projects live inside the same folder-scoped `Tasks/` workspace as the rest of the Base so the existing Base filter remains the ownership boundary.

### Task relationships

Tasks associate with projects through the existing `project` property:

```yaml
type: task
project: Website Redesign
```

OnProgram should accept practical reference forms such as a project title, Markdown path, `.md` path, or wikilink.

### Derived progress

Project progress is calculated from linked tasks instead of being stored manually.

For V1:

- `done` and `posted` tasks count as complete.
- `cancelled` and `archived` tasks are excluded from the denominator.
- all other linked task statuses count as incomplete.
- a project with no linked tasks displays `No tasks` rather than a misleading percentage.

This keeps project progress synchronized automatically when task statuses change.

### Projects Base view

Register a native Bases custom view named **OnProgram Projects**.

The view should provide:

- project name
- project status
- priority
- due date when present
- derived progress bar
- completed / total task count
- All / Active / Archived filters
- New project action
- project status context menu
- optional navigation into a linked OnProgram Base

### Project creation

`+ New project` creates a Markdown project in the current Base's configured local task folder. It should use the same folder resolution and property mapping guarantees as normal OnProgram task creation.

### Filtering semantics

- **All**: every project in the current Base result set.
- **Active**: projects that are not `done`, `cancelled`, or `archived`.
- **Archived**: projects whose status is `archived`.

Done projects remain visible in All until explicitly archived.

## Future iterations

### Project assignment UI

Add a searchable project picker to task creation and the Quick Task Editor so users do not need to type project names manually.

### Project detail / drill-down

Allow selecting a project to show its tasks, milestones, dates, dependencies, notes, and linked child Base in a project-focused detail view.

### Milestones

Surface `type: milestone` items inside project detail and calculate milestone progress independently from task completion.

### Project health

Derive useful signals such as overdue, blocked, unscheduled work, approaching deadline, and no-next-action.

### Nested projects

Support parent project relationships and parent/child project rollups while avoiding recursive cycles.

### Dashboard integration

The future OnProgram Dashboard should consume this same project-rollup layer to show active projects, progress, overdue projects, blocked projects, and upcoming deadlines.

## Design principles

1. Markdown remains authoritative.
2. Project progress is derived wherever possible.
3. A Base remains the workspace ownership boundary.
4. Existing `project` properties should continue to work without migration.
5. Projects should compose naturally with Board, Calendar, Timeline, linked Bases, and the future Dashboard.
