# Quick Task Editor

Sprint 3.2 adds the first reusable OnProgram work-item editor.

## Command

Open a valid work-item Markdown file and run:

**OnProgram: Edit active work item**

The command is only available when the active file parses as a valid OnProgram work item.

## Editable fields

- Title
- Status
- Project
- Priority
- Start
- Due
- Scheduled
- Duration
- Notes

`Notes` is the Markdown body of the backing file. OnProgram does not create a second notes property in frontmatter.

## File behavior

### Title

Changing Title renames the backing Markdown file in its current folder through Obsidian's `FileManager.renameFile` API.

A rename is rejected if the target filename already exists.

### Metadata

Status, project, priority, dates, and duration are written through `WorkItemWriter`, which preserves unrelated frontmatter.

### Notes

Notes are written through `Vault.process` after locating the content boundary with Obsidian's `getFrontMatterInfo()` utility. Frontmatter is preserved.

If the note body changed after the editor was opened, the Notes write is refused instead of overwriting the newer content.

### Archive

Archive sets the canonical work-item status to `archived` through `WorkItemWriter`. It does not move or delete the file.

### Move to Trash

Move to Trash uses Obsidian's `FileManager.trashFile` API after explicit confirmation. It does not permanently delete the file directly.

### Open file

Open file closes the editor and opens the backing Markdown note in the current Obsidian leaf.

## Date input

Accepted canonical date forms remain:

```text
YYYY-MM-DD
YYYY-MM-DDTHH:mm
```

Milestones cannot clear `due`; Events cannot clear `scheduled`.

## Duration input

The editor accepts values already supported by the parser, including:

```text
90
1h 30m
45m
```

Values normalize to minutes in frontmatter.

## Data-safety rules

1. The editor refuses a save if the source file modification time changed after parsing.
2. Rename conflicts are checked before metadata/body mutations begin.
3. A concurrent Markdown-body edit is detected before replacing Notes.
4. Unrelated frontmatter is preserved by `WorkItemWriter`.
5. Delete behavior goes through Obsidian Trash.
6. Required schema fields cannot be cleared.

## Manual acceptance test

Create or open a valid task:

```yaml
---
type: task
status: todo
priority: high
custom_field: keep-me
---

Original body.
```

Run **OnProgram: Edit active work item** and change:

- Title → `Edited Task`
- Status → `in-progress`
- Project → `OnProgram`
- Due → `2026-09-30`
- Duration → `1h 30m`
- Notes → `Updated body.`

Expected result:

```yaml
---
type: task
status: in-progress
priority: high
project: OnProgram
due: 2026-09-30
duration: 90
custom_field: keep-me
---

Updated body.
```

The file should be renamed to `Edited Task.md`, and `custom_field` must survive.

Then test Archive and Move to Trash separately.

## Sprint gate

Sprint 3.2 is complete when a user can create a task in Sprint 3.1, edit it through this modal, safely rename it, update its mapped metadata and Markdown body, archive it, open its source, or move it to Trash without bypassing the Phase 2 data-safety layer.
