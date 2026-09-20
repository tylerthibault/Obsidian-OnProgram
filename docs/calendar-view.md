# OnProgram Calendar View

Phase 6 registers a Bases-native view:

```text
onprogram-calendar
```

Display name: **OnProgram Calendar**.

One calendar view supports three modes:

- Month
- Week
- Day

The mode can be changed from the calendar toolbar without changing the backing Base.

## Task types and filtering

Calendar supports user-defined task types stored in the mapped `task_types` list. OnProgram Settings ships with **Filming** and **Posting** definitions and allows adding, renaming, recoloring, changing icons, reordering, or removing registered types.

The Calendar toolbar includes a compact Task Type filter. Multiple selections use OR behavior: selecting Filming and Posting shows items containing either value. Clearing the filter shows all work items again.

Calendar cards show compact type indicators using each registered type's icon and color. Values found in Markdown that are not registered in Settings are still shown and can still be filtered; OnProgram does not delete or reject them.

Linked Markdown instances inherit task types when their target is an OnProgram work item. Links to ordinary Markdown notes remain valid and simply have no task type.

Calendar task creation can assign one or more registered task types immediately.

## Calendar field

The toolbar can place items using one of three canonical work-item fields:

- `scheduled` — when work is planned to happen;
- `due` — the deadline;
- `start` — the beginning of a work/project range.

Changing the selected field changes both rendering and drag/drop writes.

This keeps the semantic distinction established by the Work Item schema: due does not automatically mean scheduled.

## Month mode

Month mode displays a six-week calendar grid.

Features:

- previous / Today / next navigation;
- adjacent-month dates;
- Today highlight;
- date-only and date-time items grouped by calendar day;
- task creation from a day cell;
- drag between days;
- date-time moves preserve the existing time when moving to a different day;
- click a task to open the source Markdown file.

## Week mode

Week mode displays:

- seven day columns;
- all-day row;
- 24 hourly rows;
- date-only work in the all-day row;
- date-time work in the appropriate hour;
- drag between days/hours;
- double-click a time slot to create a task at that date/time;
- double-click an all-day cell to create a date-only task.

When a date-time item is moved between hourly slots, its existing minute component is preserved.

## Day mode

Day mode displays:

- all-day work;
- 24 hourly slots;
- current hour indication when viewing Today;
- timed task placement;
- drag between time slots;
- double-click to create timed work;
- Add task for date-only work.

## Unscheduled tray

Work items without the currently selected calendar field appear in a collapsible unscheduled section above the calendar.

This ensures unscheduled work does not silently disappear from the calendar workflow.

## Linked Markdown instances

When the Calendar field is **Scheduled**, Calendar creation can also add a **Linked Markdown note** instead of creating a new task.

A linked instance:

- points to any existing Markdown file in the vault;
- owns its own Calendar date/time and optional label;
- may point to the same Markdown file as any number of other instances;
- does not rewrite the target note's `scheduled` frontmatter;
- opens the target note on double-click;
- can be dragged and resized independently;
- can be edited, duplicated, or removed from its right-click menu.

Linked instances are stored in the Calendar view configuration and rendered as virtual Calendar items. They use stable instance IDs, so duplicate target paths are intentional rather than deduplicated.

The first implementation shows linked instances only when the Calendar is using the `scheduled` field. See `docs/LINKED_MARKDOWN_INSTANCES.md` for the complete model.

## Calendar-aware task creation

`TaskCreator` accepts an optional initial date placement. A task created from Calendar therefore receives its selected date field during initial frontmatter creation rather than being created and immediately rewritten.

Example creation from a 2 PM slot with `scheduled` selected:

```yaml
---
type: task
status: todo
scheduled: 2026-09-08T14:00
---
```

## Drag/write flow

```text
Drag task
   ↓
Calendar target day/time
   ↓
canonical date patch
   ↓
WorkItemWriter
   ↓
Markdown frontmatter
   ↓
Bases query refresh
   ↓
onDataUpdated()
   ↓
Calendar re-render
```

The writer retains all Phase 2 stale-write and property-map protections.

## Date behavior

### Moving between days

- date-only values remain date-only;
- date-time values keep their previous time.

### Moving into an hourly slot

The result is a date-time value.

### Required fields

If the selected field is `scheduled`, Event work items cannot clear it because the writer enforces the Event schema requirement.

## Duration

Duration is displayed in detailed timed calendar chips when available.

The first calendar implementation does not yet use pixel-height resize handles to rewrite duration. Duration remains editable through the Quick Task Editor. A later polish sprint can add direct resize behavior without changing the data model.

## Manual acceptance test

1. Create a Base containing OnProgram task files.
2. Select **OnProgram Calendar**.
3. Confirm Month mode appears.
4. Create a task from a month cell and confirm the selected date property is added to its Markdown file.
5. Drag the task to another day and confirm the Markdown date changes.
6. Switch to Week mode.
7. Drag the task to an hourly slot and confirm the value becomes a date-time.
8. Double-click another hourly slot and create a task there.
9. Switch to Day mode and confirm the same timed tasks appear.
10. Switch the calendar field from Scheduled to Due and verify placement uses `due` instead of `scheduled`.
11. Confirm items without the selected field remain visible in the unscheduled tray.
12. Assign Filming and Posting task types, filter to each type, and confirm multi-select filtering uses OR behavior.
13. Create a Calendar task with a task type selected and confirm `task_types` is written as a YAML list.
14. Add an unregistered `task_types` value manually and confirm Calendar preserves/displays it.
15. Confirm a linked Markdown instance targeting an OnProgram task follows that task's type filter.
16. Apply a Base filter and verify Calendar only receives the filtered work items.

## Phase 6 gate

Phase 6 is complete when the same Base result can be manipulated through Month, Week, and Day calendar modes, with calendar changes written to the selected Markdown date property and no parallel calendar database.
