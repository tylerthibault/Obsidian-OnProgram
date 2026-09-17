# OnProgram Multi-Platform Publishing — Master Plan

## Purpose

OnProgram currently models a content item as one work item and can track a single overall workflow status such as `todo`, `scheduled`, `done`, or `posted`. That breaks down once one piece of content is reused across several distribution channels.

The publishing feature separates **content workflow state** from **distribution state**.

One Markdown note remains the canonical content item. Each publishing platform gets its own lightweight state and optional scheduling/posting timestamps. The Calendar then renders compact platform pills along the bottom edge of the task card.

The feature must preserve OnProgram's core rule:

> Markdown remains the source of truth. The GUI is a safe editing surface over readable frontmatter.

---

## Product model

### One content item, many distribution channels

A content task remains a single Markdown file:

```yaml
---
type: task
status: done
scheduled: 2026-09-17T08:00

grade: 8.7
views_24_hours: 530

tiktok_state: posted
tiktok_scheduled: 2026-09-17T08:00
tiktok_posted: 2026-09-17T08:03

youtube_state: scheduled
youtube_scheduled: 2026-09-18T12:00

instagram_state: planned
---
```

The top-level `status` describes the work/content-production workflow. Platform-specific `*_state` properties describe distribution.

### Initial supported platforms

The first implementation supports:

| Platform | ID | Calendar abbreviation |
| --- | --- | --- |
| TikTok | `tiktok` | `TT` |
| YouTube | `youtube` | `YT` |
| Instagram | `instagram` | `IG` |

The implementation centralizes platform definitions so custom/configurable platforms can be added later without rewriting Calendar behavior.

### Platform state values

The initial platform publishing states are:

- `planned`
- `scheduled`
- `posted`
- `failed`
- `skipped`

A platform is considered **inactive for a task** when its `<platform>_state` property does not exist. Inactive platforms do not render a Calendar pill.

This is intentional: the Calendar should only display distribution channels that are relevant to that content item.

---

## Property contract

Each active platform may use three properties:

```text
<platform>_state
<platform>_scheduled
<platform>_posted
```

Examples:

```yaml
tiktok_state: posted
tiktok_scheduled: 2026-09-17T08:00
tiktok_posted: 2026-09-17T08:03
```

```yaml
youtube_state: scheduled
youtube_scheduled: 2026-09-18T12:00
```

```yaml
instagram_state: planned
```

The first version deliberately uses flat frontmatter properties. This keeps the values easy to inspect, query with Bases, filter, sort, and edit manually if needed.

---

## Calendar UX

### Card structure

Existing top badges remain unchanged. Grade and analytics continue to occupy the top area.

Publishing indicators are rendered along the **bottom** of the task card:

```text
┌────────────────────────────────┐
│ 8:00 AM           [8.7] [530]  │
│                                │
│ AI agreeing with you isn't...  │
│                                │
│ TT ✓     YT ◷     IG ·         │
└────────────────────────────────┘
```

Platform pills only exist when the corresponding `<platform>_state` property exists.

### Compact symbols

To keep cards readable:

| State | Pill symbol | Visual meaning |
| --- | --- | --- |
| Planned | `·` | Neutral / gray |
| Scheduled | `◷` | Blue/accent |
| Posted | `✓` | Green/success |
| Failed | `!` | Red/error |
| Skipped | `—` | Muted |

Examples:

```text
TT ✓
YT ◷
IG ·
```

Hover text exposes the full platform name, full state, and scheduling/posting timestamp where available.

### Responsive behavior

The bottom platform tray must remain inside the task card. It must not float beyond neighboring Calendar columns.

On narrow cards:

- platform pills stay compact;
- platform abbreviations remain visible;
- the task title remains truncated rather than colliding with the tray;
- pills may wrap if absolutely necessary, but should prefer one compact row.

---

## GUI workflows

Raw YAML editing must not be required for normal use.

### Activate a platform

Right-clicking a Calendar task exposes an action:

```text
Add publishing platform…
```

The picker only shows platforms that are not already active for that task.

Selecting a platform creates its state property with the default value:

```yaml
youtube_state: planned
```

The corresponding pill immediately appears.

### Edit a platform

Clicking a platform pill opens a small platform-specific menu:

```text
YouTube

Mark planned
Schedule…
Mark posted
Mark failed
Mark skipped
Remove platform
```

### Schedule a platform

Choosing `Schedule…` opens a modal with a date/time control.

Saving writes:

```yaml
youtube_state: scheduled
youtube_scheduled: 2026-09-18T12:00
```

If a scheduling timestamp already exists, the modal opens pre-populated with that value.

### Mark posted

Choosing `Mark posted` writes:

```yaml
youtube_state: posted
youtube_posted: <current local date-time>
```

The existing scheduled timestamp is preserved for history.

### Remove a platform

Choosing `Remove platform` removes all properties owned by that platform:

```text
youtube_state
youtube_scheduled
youtube_posted
```

The Calendar pill disappears immediately.

---

## Separation from overall task status

Platform distribution state must not replace OnProgram's top-level work-item status.

Example:

```yaml
status: done

tiktok_state: posted
youtube_state: scheduled
instagram_state: planned
```

This means the content itself is complete while distribution is still in progress.

The existing global `posted` work-item status remains supported for backward compatibility, but new publishing behavior should not depend on it.

---

## Architecture

### Publishing model module

A central module defines:

- supported platform IDs;
- display names;
- abbreviations;
- state values;
- property-key helpers;
- validation helpers;
- state-to-symbol helpers.

### Calendar publishing service

A dedicated long-running service is responsible for:

- reading platform state from Markdown frontmatter;
- decorating rendered Calendar cards;
- creating/removing the bottom platform tray;
- handling platform-pill clicks;
- adding the Calendar context-menu action for activating platforms;
- writing platform state safely through Obsidian's frontmatter processor;
- refreshing after metadata/DOM changes.

This keeps multi-platform behavior out of the core Calendar renderer and avoids coupling publishing logic to Calendar layout code.

### Schedule modal

A dedicated scheduling modal handles platform date/time input and validation.

---

## Phase plan

### Phase 1 — Data model and core platform definitions

Milestones:

- define TikTok, YouTube, and Instagram platform definitions;
- define publishing states;
- define property naming helpers;
- define compact state symbols and labels;
- document the Markdown contract.

Acceptance gate:

- any task can represent independent TikTok, YouTube, and Instagram states using readable frontmatter.

### Phase 2 — Calendar platform pills

Milestones:

- render pills at the bottom of Calendar items;
- only render platforms whose `*_state` exists;
- provide distinct state styling;
- preserve existing top grade/views/status badges;
- support narrow Calendar cards.

Acceptance gate:

- a task with TikTok and YouTube state but no Instagram state shows exactly two platform pills.

### Phase 3 — GUI platform management

Milestones:

- right-click task → Add publishing platform…;
- platform picker excludes active platforms;
- clicking a pill opens the platform-state menu;
- mark planned / posted / failed / skipped;
- remove platform.

Acceptance gate:

- a user can activate, change, and remove a platform without editing YAML.

### Phase 4 — Per-platform scheduling

Milestones:

- Schedule… action;
- date/time modal;
- pre-population of existing scheduling value;
- write `*_state: scheduled` and `*_scheduled`;
- posted timestamp when marking posted.

Acceptance gate:

- YouTube can be scheduled for a different time from TikTok on the same content task.

### Phase 5 — Help and documentation

Milestones:

- add publishing properties to OnProgram Help;
- document state meanings;
- document activation/removal behavior;
- add examples.

Acceptance gate:

- Command Palette → OnProgram Help explains the publishing fields without requiring external documentation.

---

## Follow-up phases after the first branch

These are deliberately deferred until the first interaction model proves itself.

### Publishing Calendar mode

A future Calendar mode can expand one content item into multiple platform-specific scheduled placements.

Example:

```text
Monday 8:00 AM — TikTok — Content A
Monday 12:00 PM — YouTube — Content A
Tuesday 9:00 AM — Instagram — Content A
```

The source remains one Markdown file.

### Platform-specific analytics

Future properties may include:

```text
tiktok_views_24_hours
youtube_views_24_hours
instagram_views_24_hours
```

and matching week/month fields.

Aggregate `views_24_hours`, `views_1_week`, and `views_1_month` may remain useful as cross-platform totals.

### Configurable/custom platforms

A later Settings interface can allow platform definitions such as:

- Facebook
- LinkedIn
- Threads
- X
- YouTube Shorts
- Newsletter
- Website
- custom user-defined platforms

The first implementation's platform registry is designed to make this extension straightforward.

### External integrations

Actual publishing integrations, API connections, and automated analytics retrieval are intentionally outside the initial feature. The deterministic local workflow should be excellent before external services are connected.

---

## Definition of done for the feature branch

The initial multi-platform publishing branch is ready for merge into `dev` when all of the following are true:

1. TikTok, YouTube, and Instagram can be activated independently on a task.
2. A platform with no state property creates no Calendar pill.
3. Platform pills render at the bottom of Calendar cards.
4. Pills visually distinguish planned, scheduled, posted, failed, and skipped.
5. Clicking a pill exposes platform-specific GUI controls.
6. A platform can be scheduled with a GUI date/time picker.
7. A platform can be marked posted and receive a posted timestamp.
8. A platform can be removed and its platform-owned properties deleted.
9. Existing grade/views/status badges remain intact at the top of cards.
10. Existing Calendar drag, resize, hover preview, status, and scroll-preservation behavior continues to work.
11. OnProgram Help documents the platform properties and states.
12. TypeScript and production esbuild complete successfully.
13. `dev` has not been modified; all work remains isolated on `feature/multi-platform-publishing` until explicitly merged.
