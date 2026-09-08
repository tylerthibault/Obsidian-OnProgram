# Task Creation

Sprint 3.1 introduces the first user-facing work-item creation flow in OnProgram.

## Command

**OnProgram: Create task** opens a small title modal. Submitting creates a Markdown file, initializes the required OnProgram frontmatter, and opens the new note.

## Default location

New tasks are stored in:

```text
OnProgram/Tasks
```

The folder is configurable under **Settings → OnProgram → Task folder**. Missing nested folders are created automatically. An empty setting means the vault root.

## Filename behavior

The task title becomes the Markdown filename. Characters that are unsafe across common filesystems are replaced with `-`.

Example:

```text
Build / calendar
```

becomes:

```text
Build - calendar.md
```

OnProgram never overwrites an existing note. If the filename already exists, it chooses the next available suffix:

```text
Build calendar.md
Build calendar 2.md
Build calendar 3.md
```

## Initial properties

New task frontmatter always receives the mapped equivalents of:

```yaml
type: task
status: todo
```

If **Default project** is configured, the mapped project property is also added.

OnProgram uses the configured canonical-to-vault property map, so a vault mapping such as:

```text
status → state
project → initiative
```

is respected during creation.

## Optional template

**Settings → OnProgram → Task template** may contain a vault-relative Markdown path, for example:

```text
Templates/Task.md
```

If the extension is omitted, OnProgram also tries `.md`.

The entire template file is copied first. OnProgram then updates only the required mapped task properties using Obsidian's frontmatter API.

This means template body content and unrelated metadata are preserved.

Example template:

```yaml
---
tags:
  - task
context: work
---

## Notes

## Checklist
```

After creating a task, `tags`, `context`, and the Markdown body remain, while OnProgram guarantees the task's canonical `type` and default `status`.

If the configured template cannot be found, task creation fails before any task file is created.

## Default project

The **Default project** setting is optional. It can be any string reference your vault convention understands, such as:

```text
[[OnProgram]]
```

Sprint 3.2 will expose per-task project editing. The creator service already supports a per-request project override for future UI use.

## Failure cleanup

Task creation is staged:

1. validate configuration and property map;
2. ensure the destination folder exists;
3. load the optional template;
4. choose a unique path;
5. create the file;
6. initialize required frontmatter;
7. open the file.

If frontmatter initialization fails after file creation, OnProgram attempts to delete the newly created incomplete file before reporting the error.

## Manual acceptance test

1. Leave the default task folder as `OnProgram/Tasks`.
2. Run **OnProgram: Create task**.
3. Enter `Test task`.

Expected:

```text
OnProgram/Tasks/Test task.md
```

with:

```yaml
---
type: task
status: todo
---
```

and the new file opened in Obsidian.

Run the command again with the same title.

Expected:

```text
OnProgram/Tasks/Test task 2.md
```

The first file must remain untouched.

## Template acceptance test

Create `Templates/Task.md`:

```yaml
---
custom_field: KEEP ME
---

Template body must survive.
```

Configure it as the Task template and create a new task.

Expected:

- `custom_field` remains;
- template body remains;
- `type: task` exists;
- `status: todo` exists;
- configured default project is present if set.

## Development QA performed during Sprint 3.1

The creator was tested with a mock Obsidian vault and strict TypeScript compilation for:

- nested folder creation;
- title sanitization;
- unique duplicate filenames;
- template preservation;
- default project application;
- automatic opening of the created note;
- missing-template failure before file creation.

## Sprint boundary

Sprint 3.1 intentionally keeps the creation modal minimal. Editing status, project, priority, dates, duration, and notes belongs to Sprint 3.2 — Quick Task Editor.
