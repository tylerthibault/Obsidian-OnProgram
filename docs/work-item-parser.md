# Work Item Parser

Sprint 2.2 introduces OnProgram's read-only work-item parsing pipeline.

## Purpose

The parser converts Obsidian Markdown metadata into the canonical `WorkItem` model defined in Sprint 2.1. It never writes to the vault.

```text
Markdown file
    ↓
Obsidian MetadataCache
    ↓
WorkItemParser
    ↓
valid | invalid | ignored
```

## Candidate detection

A Markdown file is considered an OnProgram candidate when it contains the property mapped to canonical `type`.

With the default mapping:

```yaml
---
type: task
status: todo
---
```

A Markdown file without `type` is **ignored**. This allows ordinary notes to coexist with OnProgram work items without being treated as errors.

A file that contains `type` but declares an unsupported type is **invalid**, because it appears to be attempting to participate in OnProgram.

## Parse result states

### Valid

The file declares a supported work-item type and all required data can be normalized safely.

### Invalid

The file declares itself as a work item but contains one or more errors, such as:

- missing required status
- unsupported status for the declared type
- invalid priority
- malformed date
- invalid duration
- malformed project/parent/dependency reference
- missing milestone due date
- missing event scheduled date

Invalid candidates remain visible to diagnostics rather than disappearing silently.

### Ignored

The file does not contain the mapped `type` property.

## Normalization rules

### Types

Types are trimmed and compared case-insensitively.

```text
Task → task
PROJECT → project
```

Supported values remain:

- `task`
- `project`
- `milestone`
- `event`

### Status

Statuses are lowercased and spaces/underscores are normalized to hyphens.

```text
In Progress  → in-progress
in_progress  → in-progress
DONE         → done
```

The normalized status must still be allowed for the declared work-item type.

### Priority

Priority is case-insensitive.

Missing priority uses the schema's internal default (`normal`) without modifying the Markdown file.

### Dates

Date-only values remain timezone-free:

```yaml
due: 2026-09-08
```

becomes internally:

```text
{ kind: "date", iso: "2026-09-08" }
```

Date/time values retain calendar/time semantics:

```yaml
scheduled: 2026-09-08T09:30
```

becomes:

```text
{ kind: "date-time", iso: "2026-09-08T09:30" }
```

Accepted date/time values may also include seconds and a valid ISO timezone suffix.

Calendar validity is checked, so values such as `2026-02-30` are rejected.

### Duration

Internally, duration is represented in minutes.

Examples accepted by the parser:

```text
90
"90"
"90m"
"90 minutes"
"1h"
"1h 30m"
```

### References

`project` and `parent` must be non-empty strings.

`depends_on` may be either one string or a YAML list of strings. Duplicate dependencies are removed during normalization.

## Source file identity

Every valid `WorkItem` carries source metadata:

```text
source.path
source.basename
```

The backing Markdown file remains the source of truth. OnProgram does not create a parallel task database.

## Vault scanner

`WorkItemScanner` reads all Markdown files through Obsidian's Vault and MetadataCache APIs and returns:

- Markdown files scanned
- valid work items
- invalid candidates
- ignored notes

The scanner is read-only.

## Obsidian command

Sprint 2.2 adds:

**OnProgram: Scan work items**

The command displays a summary notice:

```text
OnProgram scan: 3 valid, 1 invalid, 12 ignored.
```

Invalid file details are also written to the developer console.

## Manual acceptance test

Create these files in the test vault.

### `Valid Task.md`

```yaml
---
type: task
status: In Progress
priority: HIGH
scheduled: 2026-09-08T13:30
duration: 1h 30m
depends_on:
  - "[[Planning]]"
---
```

Expected: **valid**.

### `Valid Milestone.md`

```yaml
---
type: milestone
status: planned
due: 2026-10-01
---
```

Expected: **valid**.

### `Broken Event.md`

```yaml
---
type: event
status: planned
---
```

Expected: **invalid** because an Event requires `scheduled`.

### `Ordinary Note.md`

```markdown
# This is not a task

Just an ordinary note.
```

Expected: **ignored**.

Run **OnProgram: Scan work items**.

Expected summary for only these four files:

```text
2 valid, 1 invalid, 1 ignored
```

## Sprint boundary

Sprint 2.2 does **not** modify Markdown files. Writing properties safely belongs to Sprint 2.3 — Work Item Writer.
