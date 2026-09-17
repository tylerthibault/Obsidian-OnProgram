# Multi-platform publishing: single schedule source

## Decision

OnProgram uses the work item's existing canonical `scheduled` property as the single source of truth for when content is placed on the Calendar/Timeline.

Per-platform publishing fields describe distribution state only:

```yaml
scheduled: 2026-09-17T13:00

tiktok_state: scheduled
youtube_state: posted
instagram_state: planned
```

OnProgram does **not** require `tiktok_scheduled`, `youtube_scheduled`, or `instagram_scheduled` timestamps for the normal publishing workflow.

## Why

The content item is already positioned at a date/time on the OnProgram Calendar. Asking for another schedule date/time after choosing `TikTok → Scheduled` or `YouTube → Scheduled` creates duplicate data and unnecessary GUI friction.

The platform pill answers **where / what state**:

- Planned
- Scheduled
- Posted
- Failed
- Skipped

The Calendar card answers **when**.

## GUI behavior

Clicking a platform pill opens its state menu. Choosing `Mark scheduled` immediately writes the platform state and closes the menu. No schedule modal is shown.

Example:

```yaml
scheduled: 2026-09-17T13:00
tiktok_state: scheduled
```

If an early prototype created a platform-specific `*_scheduled` field, changing that platform's state through the current GUI removes the redundant legacy field.

## Posted timestamps

`*_posted` timestamps remain useful because they describe an actual event that may differ from the planned Calendar time. For example:

```yaml
scheduled: 2026-09-17T13:00
tiktok_state: posted
tiktok_posted: 2026-09-17T13:07
```

This decision can be revisited only if OnProgram later introduces a dedicated publishing calendar where a single content item can intentionally publish to different platforms at different times. Until then, the main task schedule owns time and platform state owns distribution status.
