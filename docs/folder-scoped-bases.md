# Folder-scoped OnProgram Bases

## Purpose

An OnProgram Base belongs to a vault folder. The folder is the project/workspace boundary; the Markdown files managed by that Base live in a dedicated `files/` child directory.

This is the canonical OnProgram storage model going forward.

## Canonical structure

For a folder named `Project Alpha`:

```text
Project Alpha/
├── Project Alpha.onprogram.base
└── files/
    ├── Design homepage.md
    ├── Review copy.md
    └── Launch site.md
```

The `.base` file is view/query configuration only. Work-item data remains in the Markdown files under `files/`.

## Creating a Base

In Obsidian File Explorer:

1. Right-click the folder that should own the work.
2. Choose **Create OnProgram base**.
3. OnProgram creates the folder's `files/` directory if needed.
4. OnProgram creates `<folder-name>.onprogram.base`.
5. The Base opens automatically.

If the expected OnProgram Base already exists, the context menu changes to **Open OnProgram base** and the existing Base is never overwritten.

## Generated Base

The generated Base is globally filtered to Markdown files inside its own `files/` directory.

Conceptually:

```yaml
filters:
  and:
    - 'file.inFolder("Project Alpha/files")'
    - 'file.ext == "md"'
```

It is generated with these OnProgram views:

- **Board** (`onprogram-board`)
- **Calendar** (`onprogram-calendar`)
- **Timeline** (`onprogram-timeline`)

Each generated view stores the same `taskFolder` value pointing to `Project Alpha/files`. The Base therefore owns its creation destination as well as its query scope.

## Task creation routing

Tasks created from an OnProgram Base should never depend on Obsidian's global default note location.

Supported Base-scoped creation paths:

- **Board → + New task**
- **Calendar → add/date/time creation controls**
- **Timeline → + New task**
- **OnProgram: Create task** while the active file is the OnProgram Base
- **OnProgram: Create task** while editing a Markdown work item in that Base's `files/` directory

All of those routes pass the Base-specific folder to `TaskCreator`.

If no active OnProgram Base context can be resolved, the global **Task folder** setting remains the fallback for command-palette creation.

## Full work-item property initialization

Every new task receives the complete OnProgram property set immediately. This intentionally avoids view-specific migrations later.

Using the default property mapping, a newly created task begins conceptually as:

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
---
```

A calendar-created task immediately fills the selected date field. A configured project/template may also provide values.

The point is that Board, Calendar, Timeline, and future OnProgram views can all operate on the same file without first adding missing schema keys.

## Templates

Task templates are still supported. OnProgram preserves unrelated template frontmatter and the Markdown body. Missing OnProgram fields are initialized after file creation; the canonical `type` is forced to `task`, and configured creation values such as a calendar date are applied to their mapped property.

## Property mapping

The generated Base uses the current OnProgram property mapping when it is created. For example, if canonical `status` maps to `state`, the Base's property configuration and visible property order reference `state` rather than `status`.

Changing the global property mapping after Bases and work items have already been created is a separate migration concern and must not silently rewrite user data.

## Why the Base filename uses `.onprogram.base`

OnProgram creates:

```text
Project Alpha.onprogram.base
```

rather than simply `Project Alpha.base`.

The ownership-specific name avoids colliding with an unrelated Base the user may already have in the same folder and lets the folder context menu safely distinguish an OnProgram-managed Base from a generic Base.

## Data ownership

```text
Project folder
    ↓ owns
OnProgram .base file
    ↓ queries
files/*.md
    ↓ normalized by
WorkItemParser
    ↓ rendered by
Board / Calendar / Timeline
    ↓ mutations through
WorkItemWriter
    ↓
files/*.md
```

There is no hidden OnProgram database.

## Acceptance test

Create a clean test folder named `Project Alpha`.

### Base creation

1. Right-click `Project Alpha`.
2. Choose **Create OnProgram base**.
3. Confirm these paths exist:

```text
Project Alpha/Project Alpha.onprogram.base
Project Alpha/files/
```

4. Confirm the Base opens.
5. Confirm Board, Calendar, and Timeline are available as Base views.

### Board creation

1. Open **Board**.
2. Click **+ New task**.
3. Create `Board task`.
4. Confirm the backing file is exactly:

```text
Project Alpha/files/Board task.md
```

5. Confirm it contains the complete OnProgram property set.
6. Confirm it appears on the Board without changing the Base filter.

### Calendar creation

1. Switch to **Calendar**.
2. Create `Calendar task` on a date.
3. Confirm:

```text
Project Alpha/files/Calendar task.md
```

4. Confirm the selected date property is populated and the other canonical properties still exist.
5. Confirm the same file is immediately part of the Base dataset.

### Timeline creation

1. Switch to **Timeline**.
2. Click **+ New task**.
3. Confirm the file is created in `Project Alpha/files/` and appears in the timeline's unscheduled section until it receives timeline dates.

### Command routing

1. With `Project Alpha.onprogram.base` active, run **OnProgram: Create task**.
2. Confirm the new file is created in `Project Alpha/files/`.
3. Open one of the files under `Project Alpha/files/`.
4. Run **OnProgram: Create task** again.
5. Confirm the new task is still created in `Project Alpha/files/`.

### Isolation

1. Create another folder named `Project Beta` and create an OnProgram Base there.
2. Confirm its tasks are written to `Project Beta/files/`.
3. Confirm Project Alpha's Base does not show Project Beta files and vice versa.

### Existing Base safety

1. Right-click `Project Alpha` again.
2. Confirm the menu says **Open OnProgram base**.
3. Select it.
4. Confirm the existing Base opens without being regenerated or overwritten.

## Known UI boundary

OnProgram guarantees folder routing for creation controls owned by OnProgram and for the OnProgram command-palette path described above. If Obsidian itself exposes a generic Base creation control outside the custom OnProgram view API, that core control is not assumed to inherit OnProgram's destination rules unless explicitly verified against the current Obsidian API.

The OnProgram **+ New task** controls are therefore the authoritative creation path for a folder-scoped Base.
