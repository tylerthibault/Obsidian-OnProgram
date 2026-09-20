# Multi-platform publishing: note state + generic linked instances

## Decision

OnProgram keeps publishing state on the content note, but does **not** model repeated Calendar appearances with platform-specific schedule properties.

The note's normal `scheduled` property remains its canonical/default work schedule:

```yaml
scheduled: 2026-09-17T13:00

tiktok_state: posted
youtube_state: planned
instagram_state: planned
```

If the same Markdown content needs another Calendar appearance on another day, OnProgram uses a **linked Markdown instance** instead of adding fields such as:

```text
tiktok_scheduled
youtube_scheduled
instagram_scheduled
```

## Why

The underlying requirement is broader than social publishing.

The same note may need multiple independent appearances for:

- TikTok / Instagram / YouTube distribution;
- reposts;
- review sessions;
- reminders;
- newsletter reuse;
- client delivery;
- presentations;
- follow-ups;
- any future workflow the user invents.

Encoding those appearances as platform-specific frontmatter would couple the Calendar data model to one use case.

Linked Markdown instances solve the general problem:

> One Markdown note, many OnProgram appearances.

## Example

The source note remains a single file:

```text
Content/Your Memory.md
```

The Calendar view may store several independent linked instances pointing at it:

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

Both cards open the same Markdown note. Moving either card changes only that linked instance.

## Publishing state

Platform state remains note-level distribution metadata:

```text
tiktok_state
youtube_state
instagram_state

tiktok_posted
youtube_posted
instagram_posted
```

The optional linked-instance label is descriptive only. It is not limited to social platforms and does not create new platform-specific schema.

## Posted timestamps

Posted timestamps remain useful because they describe an actual distribution event:

```yaml
tiktok_state: posted
tiktok_posted: 2026-09-19T13:07
```

Linked Calendar instances and publishing state therefore solve different problems:

- linked instance = where/when this note appears in OnProgram;
- publishing metadata = what happened on a distribution platform.

See `docs/LINKED_MARKDOWN_INSTANCES.md` for the linked-instance model and interaction details.
