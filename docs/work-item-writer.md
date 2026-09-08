# Work Item Writer

Sprint 2.3 introduces OnProgram's controlled Markdown frontmatter writer.

The writer is intentionally narrow: it can modify canonical OnProgram work-item fields, but it cannot arbitrarily rewrite a note.

## Core safety rule

> The Markdown file remains the source of truth. A writer operation changes only the mapped properties explicitly included in the patch.

OnProgram uses Obsidian's `FileManager.processFrontMatter` API so frontmatter updates are applied to the current file contents rather than reconstructing the note from a stale cached copy.

## Write pipeline

```text
WorkItem snapshot
      ↓
canonical patch
      ↓
stale-file check
      ↓
property-map validation
      ↓
current frontmatter
      ↓
patch validation
      ↓
processFrontMatter
      ↓
Markdown file
```

## Supported patch fields

The writer can currently modify:

- status
- priority
- project
- start
- end
- due
- scheduled
- duration
- completed
- parent
- dependencies

Changing a work item's `type` is intentionally not part of the generic writer contract.

## Clearing optional properties

Optional properties use `null` to mean "remove this YAML property."

For example:

```text
priority: null
```

removes the mapped priority property instead of writing an empty value.

An empty dependency list is also represented by removing the dependency property.

## Required-property protection

The writer refuses destructive changes that would violate the schema.

Examples:

- a Milestone cannot have its `due` property removed;
- an Event cannot have its `scheduled` property removed;
- a status must be valid for the current work-item type.

The write fails before the frontmatter mutation is applied.

## Property-map safety

Before every write, OnProgram verifies that:

- every mapped YAML property name is non-empty;
- mapped names do not contain line breaks;
- two canonical fields do not map to the same YAML property.

A duplicate mapping is rejected because it could cause one work-item field to overwrite another.

## Optimistic concurrency

Every parsed `WorkItem` records:

```text
source.path
source.basename
source.mtime
```

When `updateItem()` writes a parsed work item, the current file modification time must still match the captured `mtime`.

If the user or another plugin changed the file after OnProgram parsed it, the write fails with a conflict instead of overwriting the newer edit.

Conceptually:

```text
OnProgram reads file at mtime 100
             ↓
User edits file → mtime 101
             ↓
Old OnProgram view attempts write
             ↓
WRITE REFUSED
```

The view should reload/reparse the item and let the user retry.

## Per-file write serialization

OnProgram serializes its own writes per Markdown path.

Two OnProgram actions targeting the same file cannot run through the frontmatter writer simultaneously. This avoids plugin-generated race conditions while still allowing different files to be updated independently.

## Completion helpers

`completeItem()` performs a coordinated update:

```yaml
status: done
completed: <current local date/time>
```

`reopenItem()` restores the work item's schema default status and removes `completed`.

Examples of default reopen states:

```text
task      → todo
project   → planned
milestone → planned
event     → planned
```

## Preservation guarantees

A writer patch does not intentionally modify:

- unrelated frontmatter properties;
- note body content;
- headings;
- links;
- tags not represented by a patched OnProgram property;
- other plugin metadata.

Example source:

```yaml
---
type: task
status: todo
client: Acme
invoice_id: 1234
---
```

Completing the task produces the logical equivalent of:

```yaml
---
type: task
status: done
client: Acme
invoice_id: 1234
completed: 2026-09-08T12:00
---
```

The `client` and `invoice_id` fields are untouched.

## Temporary acceptance commands

Sprint 2.3 exposes two explicit development commands:

- **OnProgram: Writer test: complete active work item**
- **OnProgram: Writer test: reopen active work item**

These commands intentionally modify the active work-item file and are labeled as writer tests so they are not mistaken for finished workflow UI.

## Manual acceptance test

Create `Writer Test.md`:

```yaml
---
type: task
status: todo
priority: high
custom_field: PRESERVE ME
---
```

Add any Markdown body underneath the frontmatter.

Open that note and run:

**OnProgram: Writer test: complete active work item**

Expected:

- `status` becomes `done`;
- `completed` is added;
- `priority` remains `high`;
- `custom_field` remains exactly intact;
- the Markdown body remains intact.

Then run:

**OnProgram: Writer test: reopen active work item**

Expected:

- `status` becomes `todo`;
- `completed` is removed;
- unrelated properties and body remain intact.

## Conflict acceptance test

1. Let OnProgram parse a work item through a view/command.
2. Modify the Markdown file before the pending work-item snapshot is written.
3. Attempt a write from the stale snapshot.

Expected: OnProgram refuses the stale write and reports that the file changed after it was read.

## Automated development QA performed during Sprint 2.3

The writer was exercised against a mock Obsidian file manager to verify:

- strict TypeScript compilation;
- completion changes only `status` and `completed`;
- unrelated frontmatter survives;
- stale source `mtime` causes a write conflict;
- reopening clears completion while preserving unrelated fields;
- removing a required Milestone due date is rejected before mutation.

## Sprint boundary

Sprint 2.3 provides the safe write foundation only. Task-creation commands, reusable task editors, and user-facing management workflows belong to Phase 3.
