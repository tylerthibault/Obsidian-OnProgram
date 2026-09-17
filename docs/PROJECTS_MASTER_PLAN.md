# OnProgram Projects — Master Plan

## Goal

Projects add a first-class layer above individual tasks while keeping Markdown as the source of truth. A project is a normal Markdown work item with `type: project`. Tasks continue to use the canonical `project` property to associate themselves with a project.

The Projects experience is a rollup over ordinary Markdown work items, not a second database. Project membership, status, dates, notes, milestones, schedule, and completion signals all come from the same files already visible to the current Obsidian Base.

A project does **not** require a known task count. Work can be attached whenever it is discovered. For that reason, OnProgram describes task progress as **Current linked work** rather than claiming that a percentage represents the project's absolute overall completion.

## Project work items

A project is stored as Markdown frontmatter, for example:

```yaml
type: project
status: planned
priority: normal
start:
due:
onprogram_base:
```

Projects live inside the same folder-scoped `Tasks/` workspace as the rest of the Base so the existing Base filter remains the ownership boundary.

Project status is intentional and manual. Completing every task that is currently linked does not automatically mark the project `done`, because additional work may still be discovered later.

## Task relationships

Tasks associate with projects through the existing `project` property. OnProgram-created relationships use an Obsidian wikilink to the actual project note:

```yaml
type: task
project: "[[Tasks/Website Redesign]]"
```

Reference matching remains backward-compatible with practical existing forms such as a project title, Markdown path, `.md` path, or wikilink.

Project assignment is available across OnProgram views through a shared searchable project picker. The Projects workspace also retains the **Manage tasks** popup for bulk discovery, attachment, reassignment, and removal.

## Current linked work semantics

Project task rollups are calculated from linked tasks rather than stored manually.

- `done` and `posted` tasks count as completed work.
- Changing a task to `done` or `posted` through the project workspace also records its completion timestamp.
- `cancelled` and `archived` tasks are excluded from the current-work denominator.
- all other linked task statuses count as remaining work.
- a project with no linked tasks displays `No tasks` / `No linked tasks yet` rather than a misleading percentage.
- adding or removing task files can make the total grow or shrink at any time.

This rollup describes the completion of the work OnProgram currently knows is connected to the project. It does not auto-complete the project itself.

## Projects index

The native Bases custom view **OnProgram Projects** starts with a compact project index rather than stretching a sparse row across an ultrawide workspace.

Each project entry surfaces the project name, status, priority, due date, current-linked-work progress, remaining work, blocked/waiting work, overdue work, task manager access, project note access, and linked Base access when applicable.

The index supports **All / Active / Archived** filters. Clicking the project name or project card drills into the project workspace; right-click retains administrative actions and status controls.

Filtering semantics:

- **All**: every project in the current Base result set.
- **Active**: projects that are not `done`, `cancelled`, or `archived`.
- **Archived**: projects whose status is `archived`.

Done projects remain visible in All until explicitly archived.

## Project detail workspace

Selecting a project opens an in-view workspace focused only on that project. It is designed to answer: what is this project, what currently needs attention, what is happening next, and what work is connected to it?

### Summary

The top of the workspace shows:

- project status, priority, and due date
- Current linked work progress
- remaining task count
- blocked/waiting task count
- overdue task count
- scheduled task count
- start/due project range when present

The progress card explicitly explains that linked work can grow or shrink over time.

### Next Up

The workspace automatically surfaces a short list of relevant open tasks. In-progress and scheduled work is favored, followed by planned/todo/inbox work, with dates and priority used to make the list useful without requiring another manually maintained property.

### Tasks

The task workspace is the primary day-to-day project surface. Users can:

- create a new Markdown task already linked to the project
- open the bulk **Manage existing** picker
- mark ordinary tasks complete/reopen them
- change task status through a context menu
- edit task dates, priority, notes, and other properties through the GUI editor
- remove a task from the project without deleting its file
- open the underlying task note

Tasks are grouped into In progress, Up next, Blocked / waiting, Completed, and Cancelled / archived sections. Completed and closed sections are collapsible so active work stays prominent.

A task whose status is `posted` is displayed and counted as completed project work. A posted task is intentionally not reopened through the simple checkbox; its status can be changed deliberately from the Status control when needed.

### Schedule

The project workspace includes a project-specific schedule rollup using the same task properties already used elsewhere in OnProgram. Active linked tasks with `scheduled`, `due`, or `start` values are shown chronologically. The task editor remains the GUI for changing those dates, so this surface does not introduce a duplicate scheduling model.

### Milestones

Milestones are optional first-class Markdown work items:

```yaml
type: milestone
status: planned
project: "[[Tasks/Website Redesign]]"
due: 2026-10-18
```

The project workspace can create milestones through a small popup, display them by due date, change their status, edit them, and open their backing note. Milestones are checkpoints and do not alter the task-progress denominator.

### Project notes

The Markdown body of the project note remains the place for goals, requirements, links, decisions, context, or longer-form planning. The project workspace shows a compact preview and provides direct Open note / Edit project actions.

### Project details

The bottom detail area surfaces status, priority, start, due, and linked Base while preserving the existing GUI editor for property changes.

## Project creation

`+ New project` creates a Markdown project in the current Base's configured local task folder. It uses the same folder resolution and property mapping guarantees as normal OnProgram task creation.

## Cross-view project relationships

Project membership belongs to the Markdown work item, not to an individual view. Board, Calendar, Timeline, Inspector, and Projects all read/write the same project relationship.

Calendar additionally displays a compact project indicator on assigned task cards while retaining publishing indicators separately.

## Future iterations

### Richer project schedule

The current project schedule is a focused chronological rollup. A later iteration can reuse the full Calendar/Timeline renderer inside a project-filtered context if that proves more useful than the compact schedule list.

### Project health rules

Expand the current remaining / blocked / overdue / scheduled signals with optional concepts such as approaching deadline, stale project, no-next-action, or unscheduled active work. Health should remain derived and explainable rather than becoming another manually synchronized field.

### Nested projects

Support parent project relationships and parent/child project rollups while avoiding recursive cycles.

### Dashboard integration

The future OnProgram Dashboard should consume this same project-rollup layer to show active projects, current linked work, overdue projects, blocked projects, upcoming deadlines, and Next Up items without creating separate dashboard data.

## Design principles

1. Markdown remains authoritative.
2. A project can evolve without a known final task count.
3. `done` and `posted` both represent completed project task work.
4. Project status remains a deliberate project-level decision rather than being inferred from the current task list.
5. Project rollups are derived wherever possible.
6. A Base remains the workspace ownership boundary.
7. Existing `project` property forms continue to work without migration.
8. Projects compose with Board, Calendar, Timeline, linked Bases, and the future Dashboard instead of introducing parallel data models.
