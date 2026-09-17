# OnProgram Multi-Platform Publishing — Master Plan

## Purpose

OnProgram treats one piece of content as one work item. That work item may be reused across several distribution channels, so one overall task status is not enough to describe where the content has been distributed.

The publishing feature separates **content/workflow state** from **platform distribution state** while keeping one Markdown note as the source of truth.

The guiding rules are:

> One content item, many platform states.

> The Calendar's existing `scheduled` value is the single source of truth for when the content belongs on the schedule.

> Platform state is controlled primarily through a right-click context menu; the pills at the bottom of the card are compact indicators.

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

The normal OnProgram work-item properties continue to describe the content item itself. Platform properties describe distribution only.

The initial supported platforms are:

| Platform | Property prefix | Calendar pill |
| --- | --- | --- |
| TikTok | `tiktok` | `TT` |
| YouTube | `youtube` | `YT` |
| Instagram | `instagram` | `IG` |

The platform registry is centralized so additional platforms can be introduced later.

---

## Platform states

Each active platform has one state property:

```text
<platform>_state
```

Supported values are:

- `planned`
- `scheduled`
- `posted`
- `failed`
- `skipped`

Examples:

```yaml
tiktok_state: posted
youtube_state: scheduled
instagram_state: planned
```

A platform is inactive when its state property does not exist or is empty. Inactive platforms do not render a pill on the Calendar card.

This keeps the Calendar uncluttered. A task that only uses TikTok and YouTube should not show an Instagram indicator.

---

## Scheduling rule

Platform state does **not** create another scheduling timeline.

The work item's canonical OnProgram property remains the single schedule source:

```yaml
scheduled: 2026-09-17T08:00
```

If TikTok and YouTube are both marked `scheduled`, they are understood to be scheduled for the content item's Calendar placement unless a future product requirement explicitly introduces separate publishing events.

The current GUI does not create or depend on:

```text
tiktok_scheduled
youtube_scheduled
instagram_scheduled
```

Early prototype values using those properties are treated as legacy data. When a platform is changed or removed through the current GUI, the corresponding legacy `*_scheduled` value is cleaned up.

This prevents duplicate schedule information from drifting out of sync.

---

## Posted timestamps

When a platform is marked Posted, OnProgram may record the actual local posting timestamp:

```yaml
tiktok_state: posted
tiktok_posted: 2026-09-17T08:03
```

The posted timestamp is useful because the Calendar time describes when the content was planned, while the posted timestamp can describe when distribution actually occurred.

Changing a platform away from Posted removes its `*_posted` timestamp.

Removing a platform removes its state and any platform-owned legacy/posting metadata.

---

## Calendar card UX

Grade, analytics, and other existing top badges remain at the top of the card.

Publishing indicators live along the **bottom** of the card:

```text
┌────────────────────────────────┐
│ 8:00 AM           [8.7] [530]  │
│                                │
│ AI agreeing with you isn't...  │
│                                │
│ TT ✓     YT ◷     IG ·         │
└────────────────────────────────┘
```

The compact state language is:

| State | Symbol | Meaning |
| --- | --- | --- |
| Planned | `·` | Intended for this platform |
| Scheduled | `◷` | Scheduled/distribution queued |
| Posted | `✓` | Published |
| Failed | `!` | Distribution failed/problem |
| Skipped | `—` | Deliberately not distributed |

The pills are primarily **status indicators**, not precision interaction targets.

On narrow cards they remain compact and inside the card boundary. The title truncates rather than colliding with publishing indicators.

---

## Primary interaction: right-click menu

The Calendar card's right-click context menu is the publishing control center.

### No active platforms

A task with no platform state properties shows:

```text
Add TikTok
Add YouTube
Add Instagram
```

Selecting one adds that platform with the default state:

```yaml
youtube_state: planned
```

The corresponding pill then appears immediately.

### Some active platforms

If TikTok is already active while YouTube and Instagram are not, the menu becomes:

```text
TikTok — Planned     >
----------------------
Add YouTube
Add Instagram
```

Hovering the active TikTok entry opens a submenu:

```text
✓ Planned
  Scheduled
  Posted
  Failed
  Skipped
----------------------
  Remove TikTok
```

The current state is indicated with a check mark.

### All platforms active

If all three platforms are active, the top-level menu contains three platform submenus:

```text
TikTok — Posted      >
YouTube — Scheduled  >
Instagram — Planned  >
```

Each submenu controls only that platform.

---

## Why the context menu replaces the `+` button

The first prototype placed a small `+` control inside Calendar cards. This created several problems:

- small timed cards left very little usable click space;
- enlarging the control damaged card layout;
- draggable Calendar cards competed with the button interaction;
- the separate picker popup introduced another UI layer;
- platform pills themselves were too small to be ideal primary controls.

The right-click menu solves these problems by giving the user a large, native Obsidian menu target without consuming any Calendar-card space.

The current design therefore removes:

- the Calendar `+` publishing button;
- the publishing platform picker popup;
- the publishing schedule popup;
- the extra interaction guard that existed only to make buttons reliable inside draggable cards.

---

## Separation from work-item status

Publishing state and work-item status are separate concepts.

Example:

```yaml
status: todo
scheduled: 2026-09-17T08:00

tiktok_state: posted
youtube_state: scheduled
instagram_state: planned
```

The content can therefore have its normal OnProgram workflow while distribution progresses independently.

The legacy Calendar right-click actions such as `Mark scheduled`, `Mark done`, and `Mark posted` have been removed from the Calendar interaction so they do not compete conceptually with platform publishing controls.

Existing top-level statuses remain readable and continue to receive their existing visual treatment for backward compatibility.

---

## Architecture

### Publishing platform model

`src/models/publishing/PublishingPlatform.ts` defines:

- supported platform IDs;
- names and abbreviations;
- publishing states;
- property-key helpers;
- state normalization;
- state labels and compact symbols.

### Calendar publishing service

`src/services/publishing/CalendarPublishingService.ts` owns the Calendar publishing UX.

Responsibilities include:

- reading platform state from frontmatter;
- rendering the bottom status tray;
- rendering only active platforms;
- opening the right-click publishing menu;
- creating native hover submenus for active platforms;
- adding inactive platforms;
- changing platform states;
- removing platforms;
- recording/removing posted timestamps;
- cleaning prototype per-platform schedule fields;
- refreshing after metadata and Calendar DOM changes.

The service intentionally sits outside the core Calendar renderer so publishing behavior stays modular.

---

## Help/documentation behavior

`OnProgram: Help` documents the publishing state fields.

Primary current properties are:

```text
tiktok_state
youtube_state
instagram_state

tiktok_posted
youtube_posted
instagram_posted
```

The canonical task `scheduled` property remains the schedule source.

---

## Future phases

### Additional/configurable platforms

A later Settings interface may add:

- Facebook
- LinkedIn
- Threads
- X
- YouTube Shorts
- Newsletter
- Website
- custom user-defined channels

The current platform registry is designed to make this extension straightforward.

### Platform-specific analytics

Future analytics may include fields such as:

```text
tiktok_views_24_hours
youtube_views_24_hours
instagram_views_24_hours
```

with matching week/month measurements.

Existing aggregate analytics may remain useful for total cross-platform performance.

### Separate publishing events, only if genuinely needed

A future publishing-specific Calendar could represent separate platform placements if the workflow eventually requires TikTok, YouTube, and Instagram to publish at materially different dates/times.

That should be introduced as an explicit new product model rather than duplicating schedule timestamps prematurely.

### External integrations

Actual API publishing, scheduled posting, and analytics retrieval are intentionally deferred until the local workflow is stable and useful on its own.

---

## Definition of done for this feature branch

The multi-platform publishing feature is ready to merge into `dev` when:

1. TikTok, YouTube, and Instagram can be independently activated from a Calendar card's right-click menu.
2. A platform with no state property produces no Calendar pill.
3. Platform pills remain at the bottom of Calendar cards and do not interfere with top badges.
4. Active platforms appear as hover submenus in the right-click menu.
5. Each submenu supports Planned, Scheduled, Posted, Failed, Skipped, and Remove.
6. Inactive platforms appear as direct `Add <platform>` actions.
7. Marking Scheduled does not ask for a second date/time.
8. The task's canonical `scheduled` value remains the only Calendar schedule source.
9. Marking Posted can record a platform-specific posted timestamp.
10. Removing a platform removes its owned publishing metadata and its pill.
11. The Calendar `+` publishing button and obsolete publishing popups are gone.
12. Existing Calendar drag, resize, scroll preservation, date counts, grade/views badges, and note opening continue to work.
13. OnProgram Help reflects the current property model.
14. TypeScript and production esbuild pass successfully.
15. `dev` remains unchanged until this feature branch is explicitly merged.
