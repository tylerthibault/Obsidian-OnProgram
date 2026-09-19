# OnProgram Multi-Platform Publishing — Master Plan

## Purpose

OnProgram treats one piece of content as one Markdown work item while tracking distribution state independently for each publishing platform.

The publishing model and the Calendar repetition model are intentionally separate:

> Publishing properties describe what happened on each platform.

> Linked Markdown instances describe where and when the same note appears again in OnProgram.

This separation keeps one Markdown note as the source of truth without coupling repeated Calendar appearances to social-platform-specific schema.

---

## Product model

A content task remains one Markdown file:

```yaml
---
type: task
status: todo
scheduled: 2026-09-17T08:00

grade: 8.7
views_24_hours: 530

tiktok_state: posted
tiktok_posted: 2026-09-17T08:03

youtube_state: scheduled
instagram_state: planned
---
```

Platform state belongs to the note. Additional Calendar appearances do not.

The initial publishing platforms remain:

| Platform | Property prefix | Calendar pill |
| --- | --- | --- |
| TikTok | `tiktok` | `TT` |
| YouTube | `youtube` | `YT` |
| Instagram | `instagram` | `IG` |

---

## Platform states

Each active platform uses:

```text
<platform>_state
```

Supported values are:

- `planned`
- `scheduled`
- `posted`
- `failed`
- `skipped`

Posted timestamps remain optional platform metadata:

```text
<platform>_posted
```

Platform state does not create a second Calendar database.

---

## Scheduling and repeated appearances

The note's canonical OnProgram property remains:

```yaml
scheduled: 2026-09-17T08:00
```

That value describes the note's own/default work schedule.

OnProgram does **not** use these platform-specific scheduling properties:

```text
tiktok_scheduled
youtube_scheduled
instagram_scheduled
```

When the same content needs another appearance at a different date/time, the Calendar creates a generic linked Markdown instance instead.

Example linked-instance data stored in the Calendar view configuration:

```json
[
  {
    "id": "link-1",
    "targetPath": "Content/Your Memory.md",
    "scheduled": "2026-09-19T13:00",
    "label": "TikTok"
  },
  {
    "id": "link-2",
    "targetPath": "Content/Your Memory.md",
    "scheduled": "2026-09-21T10:30",
    "label": "Instagram"
  }
]
```

Those are two OnProgram appearances pointing at one Markdown file.

The same mechanism can be labeled `Newsletter`, `Review`, `Reminder`, `Repost`, or anything else. Social publishing is only one use case.

See `docs/LINKED_MARKDOWN_INSTANCES.md` for the full interaction model.

---

## Calendar card UX

Grade, analytics, and publishing pills remain note-level indicators.

Publishing indicators continue to live along the bottom of normal Calendar cards:

```text
┌────────────────────────────────┐
│ 8:00 AM           [8.7] [530]  │
│                                │
│ AI agreeing with you isn't...  │
│                                │
│ TT ✓     YT ◷     IG ·         │
└────────────────────────────────┘
```

Linked Markdown instances use a dashed card treatment and append their optional label to the source note title so repeated appearances can be distinguished.

Double-clicking any linked instance opens the same source Markdown note.

---

## Publishing interaction

The Calendar card right-click menu remains the publishing control center for normal content cards.

Active platform submenus support:

- Planned
- Scheduled
- Posted
- Failed
- Skipped
- Remove platform

Inactive platforms remain available through direct Add actions.

Publishing state and linked-instance state are separate concepts. A linked instance's right-click menu controls the link itself:

- Open linked note
- Edit linked instance
- Duplicate linked instance
- Remove linked instance

This avoids making a generic Calendar link behave like a social-platform object.

---

## Posted timestamps

When a platform is marked Posted, OnProgram may record the actual local posting timestamp:

```yaml
tiktok_state: posted
tiktok_posted: 2026-09-17T08:03
```

Posted timestamps describe real distribution events. They are not Calendar placement records.

Changing a platform away from Posted removes its `*_posted` timestamp. Removing a platform removes its platform-owned publishing metadata.

---

## Architecture

### Publishing platform model

`src/models/publishing/PublishingPlatform.ts` defines platform IDs, names, abbreviations, publishing states, property-key helpers, state normalization, labels, and compact symbols.

### Calendar publishing service

`src/services/publishing/CalendarPublishingService.ts` owns note-level publishing state and publishing pills.

### Linked Markdown instance model

`src/services/links/LinkedMarkdownInstance.ts` owns parsing, serialization, stable instance IDs, date normalization, and target-note resolution for reusable linked appearances.

### Markdown picker

`src/components/MarkdownFilePickerModal.ts` allows any Markdown note in the vault to be selected as a link target.

### Linked instance editor

`src/components/LinkedMarkdownInstanceModal.ts` edits the target note, schedule, all-day state, label, and instance-owned duration.

### Calendar view

`src/views/bases/OnProgramCalendarView.ts` materializes stored links as virtual Calendar work items. These virtual items never create or copy Markdown files.

Dragging or resizing a linked instance writes only to the Calendar view's linked-instance configuration.

---

## Future phases

### Reuse in other OnProgram views

The linked-instance model is deliberately generic. Timeline, Dashboard, or other future views may choose to consume the same concept without adding social-specific data structures.

### Additional/configurable publishing platforms

Publishing platforms can still expand independently to Facebook, LinkedIn, Threads, X, YouTube Shorts, or custom channels.

### Platform-specific analytics

Future analytics may add fields such as:

```text
tiktok_views_24_hours
youtube_views_24_hours
instagram_views_24_hours
```

### External integrations

Actual API publishing, scheduled posting, and analytics retrieval remain future work.

---

## Definition of done for this feature branch

The feature is ready to merge into `dev` when:

1. Existing TikTok, YouTube, and Instagram state controls continue to work.
2. No platform-specific `*_scheduled` fields are required.
3. The Scheduled Calendar can create a linked instance pointing to any existing Markdown note.
4. Multiple linked instances may point to the same target note.
5. Every linked instance has a stable unique ID.
6. Each instance owns its own date/time, optional label, and timed duration.
7. Double-clicking any instance opens the single linked Markdown file.
8. Dragging an instance changes only that instance's schedule.
9. Resizing an instance changes only that instance's duration.
10. Right-click supports Open, Edit, Duplicate, and Remove for linked instances.
11. Linked notes may live outside the current Base result set.
12. Existing ordinary Calendar items continue to write scheduling changes to their own Markdown frontmatter.
13. Existing Calendar creation, scroll, badges, project indicators, publishing pills, and unscheduled behavior continue to work.
14. Documentation describes the generic linked-instance model.
15. TypeScript and production esbuild pass successfully.
16. `dev` remains unchanged until this branch is explicitly merged.
