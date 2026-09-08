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
12. Apply a Base filter and verify Calendar only receives the filtered work items.

## Phase 6 gate

Phase 6 is complete when the same Base result can be manipulated through Month, Week, and Day calendar modes, with calendar changes written to the selected Markdown date property and no parallel calendar database.
