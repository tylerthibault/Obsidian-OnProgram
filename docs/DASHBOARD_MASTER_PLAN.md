# OnProgram Dashboard — Master Plan

## Goal

The Dashboard is OnProgram's cross-workspace command center. It composes the same Markdown-backed work items already used by Board, Calendar, Timeline, Projects, and publishing into one at-a-glance view.

The Dashboard must not introduce a second source of truth. It is presentation and rollup only.

## V1 scope

### Summary cards

Show high-signal counts for the current Base:

- Due today
- In progress
- Scheduled
- To publish
- Active projects

These values are derived from the current Base result set and existing Markdown/frontmatter.

### Needs attention

Surface active tasks that are:

- overdue
- blocked
- waiting

Tasks remain clickable and expose the shared project-assignment context menu so the Dashboard follows the same project workflow as the other OnProgram views.

### Up next

Show the next dated pieces of open work using the canonical task dates in this order:

1. `scheduled`
2. `due`
3. `start`

### Board snapshot

Provide a compact three-column view:

- To do
- In progress
- Complete

This is a summary surface, not a replacement for the full Board. The dedicated Board remains the place for drag-and-drop workflow management.

### Calendar snapshot

Show today plus the next six days with up to a few tasks per day. It uses the same canonical work-item date model and links back to the Markdown task.

### Projects snapshot

Show active projects with:

- project status
- current linked-work progress
- due date
- blocked/waiting count

Progress means completion of currently linked work, not a guarantee that the project itself is a known percentage toward final completion.

`done` and `posted` tasks count as completed linked work. `cancelled` and `archived` tasks are excluded from project progress.

### Publishing snapshot

Read the existing TikTok, YouTube, and Instagram state properties and show compact platform pills using the same workflow states as Calendar publishing:

- planned
- scheduled
- posted
- failed
- skipped

The task's canonical `scheduled` value remains the only publishing schedule.

### Quick task creation

The Dashboard provides `+ New task`, creating a normal Markdown task inside the current Base's configured local task folder.

## View integration

Register a native Bases view named **OnProgram Dashboard** with the `layout-dashboard` icon.

New OnProgram Bases should include Dashboard first, followed by:

1. Dashboard
2. Board
3. Calendar
4. Timeline
5. Projects

Existing Bases are not rewritten automatically; users can add **OnProgram Dashboard** through the normal Obsidian Base view picker.

## Design principles

1. Markdown remains authoritative.
2. The Dashboard summarizes; dedicated views remain responsible for deep interaction.
3. Project assignment must be available from Dashboard task surfaces, consistent with other OnProgram views.
4. The layout must remain useful from desktop down to mobile widths.
5. Widgets should reuse existing domain logic and property semantics instead of inventing parallel models.

## Future iterations

- User-selectable widget visibility
- Drag/reorder dashboard widgets
- Persisted dashboard layouts per Base
- Date-range controls
- Compact Timeline widget
- Project drill-in directly from the Dashboard
- Publishing performance/analytics cards
- Saved dashboard presets for content, software, personal planning, and operations workflows
