# Linked Markdown Instances

## Purpose

OnProgram can place the same Markdown note on the Calendar more than once without copying the note or rewriting its scheduling metadata.

The feature is intentionally generic. Social publishing is one use case, but linked instances can also represent reminders, reviews, reposts, newsletters, presentations, follow-ups, or any other repeated appearance of the same source note.

The core rule is:

> One Markdown note can have many independent OnProgram instances.

## Data model

Linked instances are stored in the OnProgram Calendar view configuration, not in the target note's frontmatter.

Each instance has its own identity and placement:

```json
[
  {
    "id": "link-abcd1234",
    "targetPath": "Content/Your Memory.md",
    "scheduled": "2026-09-19T13:00",
    "label": "TikTok",
    "durationMinutes": 60
  },
  {
    "id": "link-efgh5678",
    "targetPath": "Content/Your Memory.md",
    "scheduled": "2026-09-21T10:30",
    "label": "Instagram",
    "durationMinutes": 60
  }
]
```

Duplicate `targetPath` values are valid and expected. The unique `id` distinguishes the appearances.

The target Markdown note remains the source of truth for its actual content, frontmatter, analytics, project membership, publishing state, and notes.

## Creating a link

When the Calendar is using the **Scheduled** field, the normal Calendar creation dialog supports:

- **Task** — create a new Markdown task.
- **Linked Markdown note** — choose any existing Markdown file and create another Calendar appearance pointing to it.

The date/time comes from the Calendar cell or time slot that opened the dialog. An optional label can describe why this appearance exists.

No Markdown file is created or copied when a linked instance is added.

## Rendering

Linked instances are materialized as virtual Calendar work items at render time.

They:

- display the linked note's filename as the title;
- append the optional instance label;
- use a dashed card treatment so they are distinguishable from normal work items;
- keep the target note path on the rendered card so note-level badges and metadata can still be read;
- double-click to open the target Markdown note;
- can point to Markdown notes that are outside the current Base result set.

The original source note can still appear normally if it is itself a scheduled OnProgram work item. Linked instances are explicitly additional appearances.

## Independent scheduling

Dragging a linked instance changes only that instance's stored `scheduled` value.

It does **not** modify:

- the target note's `scheduled` frontmatter;
- any other linked instance pointing at the same note;
- the target note's project, status, publishing state, or other metadata.

Timed linked instances also own their duration independently. Resizing one linked Calendar card changes only that instance's `durationMinutes`.

## Context menu

Right-clicking a linked instance provides:

- **Open linked note**
- **Edit linked instance…**
- **Duplicate linked instance…**
- **Remove linked instance**

Editing can change the target note, date/time, all-day status, label, and duration.

Duplicating intentionally creates a new unique instance that may point to the same Markdown file.

## Relationship to social publishing

OnProgram does not need platform-specific schedule fields such as:

```text
tiktok_scheduled
instagram_scheduled
youtube_scheduled
```

If the same video needs to appear on multiple dates, create multiple linked instances and optionally label them `TikTok`, `Instagram`, `YouTube`, `Repost`, or anything else.

Publishing state remains note-level metadata. Calendar repetition is handled by the generic linked-instance layer.

## Scope

The first implementation renders linked instances in the OnProgram Calendar when the selected Calendar field is `scheduled`.

The model is deliberately generic so later views can reuse it without introducing social-platform-specific data structures.
