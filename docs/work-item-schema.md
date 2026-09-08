# OnProgram Work Item Schema

Schema version: **1**

OnProgram treats Markdown files as the source of truth. A work item is a Markdown file whose frontmatter can be interpreted using the OnProgram schema. Views such as Board, Calendar, Timeline, and Today will operate on the same file rather than storing a second task database.

## Work item kinds

OnProgram defines four canonical work-item kinds:

| Type | Purpose | Required frontmatter |
| --- | --- | --- |
| `task` | Actionable unit of work | `type`, `status` |
| `project` | Container/outcome made up of related work | `type`, `status` |
| `milestone` | Significant point/deadline on a project timeline | `type`, `status`, `due` |
| `event` | Work or occurrence placed at a specific calendar time | `type`, `status`, `scheduled` |

The display title is derived from the Markdown file and is not required as duplicate frontmatter.

## Default property names

These names are defaults, not permanent requirements. Property-name mapping will allow OnProgram to work with existing vault conventions later.

| Canonical field | Default YAML property | Meaning |
| --- | --- | --- |
| type | `type` | Work-item kind |
| status | `status` | Current workflow state |
| project | `project` | Related project reference |
| priority | `priority` | Relative importance |
| start | `start` | Planned range start |
| end | `end` | Planned range end |
| due | `due` | Deadline |
| scheduled | `scheduled` | Planned execution/calendar placement |
| duration | `duration` | Planned duration |
| completed | `completed` | Actual completion date/time |
| parent | `parent` | Parent work-item reference |
| dependsOn | `depends_on` | One or more dependency references |

Default compound property names use lowercase snake_case. OnProgram's internal code uses canonical field names and must not assume the vault uses these exact YAML keys.

## Canonical statuses

The canonical status vocabulary is:

- `inbox`
- `todo`
- `planned`
- `in-progress`
- `blocked`
- `waiting`
- `done`
- `cancelled`
- `archived`

Default statuses:

- Task → `todo`
- Project → `planned`
- Milestone → `planned`
- Event → `planned`

Terminal statuses are `done`, `cancelled`, and `archived`.

Different work-item kinds use appropriate subsets of the canonical vocabulary. Future normalization/mapping may translate a user's existing values into these canonical internal values.

## Priority behavior

Canonical priorities are:

1. `low`
2. `normal`
3. `high`
4. `urgent`

Priority is optional. When it is absent, OnProgram treats the item as `normal` internally rather than requiring OnProgram to write a redundant property to the file.

## Date behavior

OnProgram deliberately distinguishes scheduling from deadlines.

### `scheduled`

The date/time when work is intended to happen. This is the primary field for placement on daily/weekly/monthly calendar views.

### `due`

A deadline. A task due Friday is not automatically considered scheduled for Friday.

### `start` and `end`

Range boundaries used for projects, timeline bars, events, or tasks that span time.

### `completed`

The actual completion date/time. It represents what happened, not what was planned.

### Serialized formats

The schema boundary accepts Obsidian-friendly ISO-style values:

- Date only: `YYYY-MM-DD`
- Date/time: `YYYY-MM-DDTHH:mm`

Parsing, validation, timezone behavior, and normalization are responsibilities of Sprint 2.2.

## Duration

`duration` represents planned duration. The canonical internal model stores duration in minutes. Sprint 2.2 will define how supported YAML duration values are normalized.

## References

`project`, `parent`, and `depends_on` are references to other work-item files. They may originate from Obsidian links or strings; resolution into canonical file references belongs to the parser/query layers.

`depends_on` is conceptually a list, even when a source file contains only one dependency.

## Minimal examples

### Task

```yaml
---
type: task
status: todo
---
```

### Project

```yaml
---
type: project
status: planned
---
```

### Milestone

```yaml
---
type: milestone
status: planned
due: 2026-10-01
---
```

### Event

```yaml
---
type: event
status: planned
scheduled: 2026-10-01T09:00
---
```

## Expanded task example

```yaml
---
type: task
status: in-progress
project: "[[OnProgram]]"
priority: high
start: 2026-09-08
due: 2026-09-12
scheduled: 2026-09-09T10:00
duration: 90
parent: "[[Build Calendar View]]"
depends_on:
  - "[[Define Work Item Schema]]"
---
```

## Required versus optional data

The schema keeps required data intentionally small so OnProgram can work naturally with Markdown files.

- Every valid work item requires `type` and `status`.
- A milestone additionally requires `due`.
- An event additionally requires `scheduled`.
- Priority, relationships, range dates, completion information, and duration are optional unless a future feature specifically needs them.
- Missing optional values should normally remain absent rather than being written as empty YAML properties.

## Architectural rules

1. Markdown remains the source of truth.
2. Canonical OnProgram fields are separate from physical YAML property names.
3. Views must consume normalized WorkItem objects rather than reading arbitrary frontmatter directly.
4. A due date and a scheduled date are different concepts.
5. Parsing malformed or incomplete files must never require destructive rewriting.
6. User property mappings must be configurable without changing the domain model.
7. The schema may evolve, but breaking changes require an explicit schema-version decision.

## Next sprint

Sprint 2.2 will implement the Work Item Parser: detecting candidate files, reading frontmatter, normalizing status/priority/dates/references, reporting missing required fields, and producing validated WorkItem objects without modifying the source file.
