# OnProgram Board View

Phase 5 adds a Bases-native Kanban-style board registered as:

```text
onprogram-board
```

Display name: **OnProgram Board**.

## Data source

The board consumes the current `BasesQueryResult` through `BasesWorkItemAdapter`.

Therefore the Base remains authoritative for:

- source files;
- filters;
- formulas;
- sorting;
- limits.

Only valid OnProgram work items become cards.

## Columns

Columns are generated from OnProgram's canonical status vocabulary:

- Inbox
- Todo
- Planned
- In Progress
- Blocked
- Waiting
- Done
- Cancelled
- Archived

The board does not create a separate status database. A column is simply a visual representation of the mapped work-item status property.

## Cards

Cards currently display:

- file/title;
- priority;
- project when present;
- due date when present;
- scheduled date/time when present.

Selecting the card title opens the backing Markdown file.

## Drag and drop

Dragging a card to another column calls:

```text
WorkItemWriter.updateItem(item, { status })
```

Before writing, OnProgram verifies that the destination status is allowed for the work-item type. For example, a Project cannot be moved to a task-only status if that status is not allowed by the canonical schema.

The actual flow is:

```text
Drag card
   ↓
validate destination status
   ↓
WorkItemWriter
   ↓
Markdown frontmatter status
   ↓
Bases query refresh
   ↓
onDataUpdated()
   ↓
board re-render
```

## Ordering

Card ordering follows the sort order already configured in the Base.

OnProgram does not currently invent a hidden `board_order` property. If persistent manual within-column ordering becomes necessary, it should be an explicit future schema/configuration decision rather than invisible metadata.

## Filtering and grouping

Filtering remains a Base concern. Users can filter the Base by project, folder, tag, status, priority, dates, or formulas and the Board automatically receives that filtered result set.

The Board itself groups cards into status columns.

## Relationship to Obsidian native Kanban

Obsidian 1.14 adds its own Bases Kanban layout. OnProgram Board intentionally remains useful as a plugin-owned fallback/work-item-specific view, especially while 1.14 availability varies and for behavior tied to the OnProgram schema.

When the native Kanban satisfies a workflow, users can use it and group by the mapped status property. Moving native Kanban cards updates Markdown properties, which OnProgram will parse normally.

## Manual acceptance test

1. Create a Base containing several OnProgram tasks.
2. Select **OnProgram Board** as the Base view.
3. Confirm tasks appear in columns matching their status.
4. Configure a Base filter and confirm filtered-out tasks disappear.
5. Configure a Base sort and confirm card order follows it.
6. Drag a `todo` task into **In Progress**.
7. Confirm its Markdown frontmatter status changes to `in-progress`.
8. Confirm the card reappears in **In Progress** after the Base refresh.
9. Click the card title and confirm the backing Markdown note opens.
10. Attempt an invalid status transition for a work-item type and confirm the write is rejected.

## Phase 5 gate

Phase 5 is complete when the Board can be used as a real work-item status board over an arbitrary Base result set, with safe cross-column Markdown updates and no duplicate task storage.
