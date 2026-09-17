import type { Plugin } from "obsidian";

const POLISH_STYLE_ID = "onprogram-view-polish";

/**
 * Installs the shared visual language used by OnProgram's primary Bases views.
 *
 * The individual views remain responsible for layout and interaction. This layer
 * deliberately focuses on presentation so Board, Calendar, Timeline, Projects,
 * and the generic Bases surface feel like parts of the same command center.
 */
export function installOnProgramViewPolish(plugin: Plugin): void {
  const doc = plugin.app.workspace.containerEl.ownerDocument;
  doc.getElementById(POLISH_STYLE_ID)?.remove();

  const style = doc.createElement("style");
  style.id = POLISH_STYLE_ID;
  style.textContent = ONPROGRAM_VIEW_POLISH_STYLES;
  doc.head.appendChild(style);
  plugin.register(() => style.remove());
}

const ONPROGRAM_VIEW_POLISH_STYLES = `
/* --------------------------------------------------------------------------
 * Shared command-center language
 * ----------------------------------------------------------------------- */
.onprogram-board-view,
.onprogram-calendar-view,
.onprogram-timeline-view,
.onprogram-projects-view,
.onprogram-bases-view {
  --onprogram-polish-radius: 16px;
  --onprogram-polish-radius-small: 10px;
  --onprogram-polish-border: color-mix(in srgb, var(--background-modifier-border) 78%, transparent);
  --onprogram-polish-border-strong: color-mix(in srgb, var(--interactive-accent) 36%, var(--background-modifier-border));
  --onprogram-polish-surface: color-mix(in srgb, var(--background-secondary) 72%, var(--background-primary));
  --onprogram-polish-surface-raised: color-mix(in srgb, var(--background-primary) 90%, var(--interactive-accent) 10%);
  --onprogram-polish-accent-soft: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
  --onprogram-polish-shadow: 0 10px 28px color-mix(in srgb, black 12%, transparent);
  box-sizing: border-box;
  background:
    radial-gradient(circle at 52% -18%, color-mix(in srgb, var(--interactive-accent) 9%, transparent), transparent 36%),
    var(--background-primary);
}

.onprogram-board-view button,
.onprogram-calendar-view button,
.onprogram-timeline-view button,
.onprogram-projects-view button {
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}

/* --------------------------------------------------------------------------
 * Board
 * ----------------------------------------------------------------------- */
.onprogram-board-view {
  padding: 16px 18px 18px !important;
}

.onprogram-board-view .onprogram-board-header {
  min-height: 66px;
  margin-bottom: 14px;
  padding: 12px 14px 12px 16px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--interactive-accent) 11%, transparent), transparent 46%),
    var(--onprogram-polish-surface);
  box-shadow: 0 8px 22px color-mix(in srgb, black 8%, transparent);
}

.onprogram-board-view .onprogram-board-header h3 {
  margin: 0;
  font-size: clamp(20px, 2vw, 27px);
  letter-spacing: -0.02em;
}

.onprogram-board-view .onprogram-board-count,
.onprogram-board-view .onprogram-board-invalid-count {
  padding: 4px 9px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-primary) 76%, transparent);
  font-variant-numeric: tabular-nums;
}

.onprogram-board-view .onprogram-board-invalid-count {
  border-color: color-mix(in srgb, var(--color-red) 45%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--color-red) 10%, var(--background-primary));
  color: var(--color-red);
}

.onprogram-board-view .onprogram-board-header > button:last-child {
  margin-left: auto;
  border-color: color-mix(in srgb, var(--interactive-accent) 50%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--interactive-accent) 16%, var(--background-primary));
  color: var(--text-normal);
  font-weight: var(--font-semibold);
}

.onprogram-board-view .onprogram-board {
  gap: 12px;
  padding: 1px 2px 10px;
}

.onprogram-board-view .onprogram-board-column {
  --onprogram-board-column-accent: var(--text-muted);
  flex-basis: 300px;
  border: 1px solid var(--onprogram-polish-border);
  border-top: 2px solid var(--onprogram-board-column-accent);
  border-radius: var(--onprogram-polish-radius);
  background: color-mix(in srgb, var(--background-secondary) 64%, var(--background-primary));
  box-shadow: 0 6px 18px color-mix(in srgb, black 6%, transparent);
  overflow: hidden;
}

.onprogram-board-view .onprogram-board-column[data-status="inbox"],
.onprogram-board-view .onprogram-board-column[data-status="todo"],
.onprogram-board-view .onprogram-board-column[data-status="planned"] {
  --onprogram-board-column-accent: var(--text-muted);
}
.onprogram-board-view .onprogram-board-column[data-status="scheduled"] { --onprogram-board-column-accent: var(--color-cyan); }
.onprogram-board-view .onprogram-board-column[data-status="in-progress"] { --onprogram-board-column-accent: var(--color-blue); }
.onprogram-board-view .onprogram-board-column[data-status="blocked"] { --onprogram-board-column-accent: var(--color-red); }
.onprogram-board-view .onprogram-board-column[data-status="waiting"] { --onprogram-board-column-accent: var(--color-yellow); }
.onprogram-board-view .onprogram-board-column[data-status="done"],
.onprogram-board-view .onprogram-board-column[data-status="posted"] { --onprogram-board-column-accent: var(--color-green); }
.onprogram-board-view .onprogram-board-column[data-status="cancelled"],
.onprogram-board-view .onprogram-board-column[data-status="archived"] { --onprogram-board-column-accent: var(--text-faint); }

.onprogram-board-view .onprogram-board-column-header {
  min-height: 48px;
  padding: 11px 12px;
  border-bottom-color: var(--onprogram-polish-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--onprogram-board-column-accent) 8%, transparent), transparent);
}

.onprogram-board-view .onprogram-board-column-header strong {
  font-size: var(--font-ui-small);
  letter-spacing: .01em;
}

.onprogram-board-view .onprogram-board-column-count {
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--onprogram-board-column-accent) 12%, var(--background-primary));
  color: var(--text-normal);
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.onprogram-board-view .onprogram-board-cards {
  gap: 8px;
  padding: 9px;
}

.onprogram-board-view .onprogram-board-card {
  padding: 11px 12px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-primary) 94%, var(--interactive-accent) 6%);
  box-shadow: 0 4px 12px color-mix(in srgb, black 6%, transparent);
}

.onprogram-board-view .onprogram-board-card:hover {
  transform: translateY(-1px);
  border-color: var(--onprogram-polish-border-strong);
  box-shadow: 0 8px 18px color-mix(in srgb, black 10%, transparent);
}

.onprogram-board-view .onprogram-board-card-title,
.onprogram-board-view button.onprogram-board-card-title {
  margin: 0 0 8px;
  padding: 0;
  border: 0;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--text-normal);
  line-height: 1.35;
}

.onprogram-board-view .onprogram-board-card-meta {
  gap: 5px;
}

.onprogram-board-view .onprogram-board-card-meta span {
  padding: 2px 7px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-secondary) 72%, transparent);
  color: var(--text-muted);
}

.onprogram-board-view .onprogram-board-linked-base-card {
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--interactive-accent) 10%, transparent), transparent 58%),
    var(--background-primary);
}

.onprogram-board-view .onprogram-board-drop-target {
  border-color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 8%, var(--background-secondary));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--interactive-accent) 45%, transparent);
}

/* --------------------------------------------------------------------------
 * Calendar
 * ----------------------------------------------------------------------- */
.onprogram-calendar-view {
  padding: 16px 18px 18px !important;
}

.onprogram-calendar-view .onprogram-calendar-toolbar {
  min-height: 72px;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--interactive-accent) 10%, transparent), transparent 45%),
    var(--onprogram-polish-surface);
  box-shadow: 0 8px 22px color-mix(in srgb, black 7%, transparent);
}

.onprogram-calendar-view .onprogram-calendar-title {
  font-size: clamp(20px, 2vw, 27px);
  letter-spacing: -0.02em;
}

.onprogram-calendar-view .onprogram-calendar-nav,
.onprogram-calendar-view .onprogram-calendar-modes {
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
}

.onprogram-calendar-view .onprogram-calendar-nav button,
.onprogram-calendar-view .onprogram-calendar-modes button {
  min-height: 28px;
  border: 0;
  box-shadow: none;
  background: transparent;
}

.onprogram-calendar-view .onprogram-calendar-modes button.mod-cta {
  background: color-mix(in srgb, var(--interactive-accent) 20%, var(--background-primary));
  color: var(--text-normal);
}

.onprogram-calendar-view .onprogram-calendar-controls select {
  min-height: 32px;
  border-color: var(--onprogram-polish-border);
  background-color: color-mix(in srgb, var(--background-primary) 84%, transparent);
}

.onprogram-calendar-view .onprogram-calendar-count {
  padding: 4px 9px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
  font-variant-numeric: tabular-nums;
}

.onprogram-calendar-view .onprogram-calendar-unscheduled {
  margin-bottom: 12px;
  padding: 8px 11px;
  border-color: var(--onprogram-polish-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-secondary) 70%, var(--background-primary));
}

.onprogram-calendar-view .onprogram-calendar-unscheduled summary {
  cursor: pointer;
  font-weight: var(--font-medium);
}

.onprogram-calendar-view .onprogram-calendar-month,
.onprogram-calendar-view .onprogram-calendar-week,
.onprogram-calendar-view .onprogram-calendar-day-hours {
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background: var(--background-primary);
  box-shadow: 0 8px 24px color-mix(in srgb, black 6%, transparent);
}

.onprogram-calendar-view .onprogram-calendar-month,
.onprogram-calendar-view .onprogram-calendar-week {
  border-top: 1px solid var(--onprogram-polish-border) !important;
  border-left: 1px solid var(--onprogram-polish-border) !important;
}

.onprogram-calendar-view .onprogram-calendar-weekday,
.onprogram-calendar-view .onprogram-calendar-week-day-header {
  border-color: var(--onprogram-polish-border);
  background: color-mix(in srgb, var(--background-secondary) 84%, var(--background-primary));
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  text-transform: uppercase;
  letter-spacing: .045em;
}

.onprogram-calendar-view .onprogram-calendar-week-day-header strong {
  display: block;
  margin-top: 2px;
  color: var(--text-normal);
  font-size: 16px;
}

.onprogram-calendar-view .onprogram-calendar-day-cell,
.onprogram-calendar-view .onprogram-calendar-week-cell,
.onprogram-calendar-view .onprogram-calendar-day-slot,
.onprogram-calendar-view .onprogram-calendar-time-label {
  border-color: var(--onprogram-polish-border);
}

.onprogram-calendar-view .onprogram-calendar-day-cell {
  padding: 5px;
  background: color-mix(in srgb, var(--background-primary) 97%, var(--background-secondary));
}

.onprogram-calendar-view .onprogram-calendar-day-cell:hover {
  background: color-mix(in srgb, var(--interactive-accent) 3%, var(--background-primary));
}

.onprogram-calendar-view .onprogram-calendar-outside-month {
  background: color-mix(in srgb, var(--background-secondary) 60%, var(--background-primary));
  opacity: .62;
}

.onprogram-calendar-view .onprogram-calendar-today {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--interactive-accent) 80%, transparent);
  background: color-mix(in srgb, var(--interactive-accent) 6%, var(--background-primary));
}

.onprogram-calendar-view .onprogram-calendar-day-header > span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  border-radius: 999px;
  font-weight: var(--font-semibold);
}

.onprogram-calendar-view .onprogram-calendar-today .onprogram-calendar-day-header > span:first-child {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.onprogram-calendar-view .onprogram-calendar-add {
  border: 0;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
  color: var(--text-faint);
}

.onprogram-calendar-view .onprogram-calendar-add:hover {
  background: var(--onprogram-polish-accent-soft);
  color: var(--interactive-accent);
}

.onprogram-calendar-view .onprogram-calendar-item {
  margin-bottom: 4px;
  padding: 4px 6px;
  border-color: var(--onprogram-polish-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--background-secondary) 72%, var(--background-primary));
  box-shadow: 0 2px 7px color-mix(in srgb, black 5%, transparent);
}

.onprogram-calendar-view .onprogram-calendar-item:hover {
  border-color: var(--onprogram-polish-border-strong);
  background: color-mix(in srgb, var(--interactive-accent) 7%, var(--background-secondary));
}

.onprogram-calendar-view .onprogram-calendar-item-title {
  font-weight: var(--font-medium);
}

.onprogram-calendar-view .onprogram-calendar-day-all-day {
  margin-bottom: 10px;
  border-color: var(--onprogram-polish-border);
  border-radius: 12px;
  background: var(--onprogram-polish-surface);
}

.onprogram-calendar-view .onprogram-calendar-current-hour {
  box-shadow: inset 0 2px 0 var(--interactive-accent), inset 0 0 24px color-mix(in srgb, var(--interactive-accent) 4%, transparent);
}

/* --------------------------------------------------------------------------
 * Timeline
 * ----------------------------------------------------------------------- */
.onprogram-timeline-view.onprogram-timeline-view {
  padding: 16px 18px 18px;
  background:
    radial-gradient(circle at 52% -18%, color-mix(in srgb, var(--interactive-accent) 9%, transparent), transparent 36%),
    var(--background-primary);
}

.onprogram-timeline-view .onprogram-timeline-toolbar {
  min-height: 66px;
  gap: 8px;
  margin-bottom: 12px;
  padding: 11px 13px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--interactive-accent) 10%, transparent), transparent 45%),
    var(--onprogram-polish-surface);
  box-shadow: 0 8px 22px color-mix(in srgb, black 7%, transparent);
}

.onprogram-timeline-view .onprogram-timeline-toolbar::before {
  content: "Timeline";
  margin-right: 6px;
  color: var(--text-normal);
  font-size: clamp(20px, 2vw, 27px);
  font-weight: var(--font-semibold);
  letter-spacing: -0.02em;
}

.onprogram-timeline-view .onprogram-timeline-unscheduled-count {
  padding: 4px 9px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
  font-size: var(--font-ui-smaller);
}

.onprogram-timeline-view .onprogram-timeline-unscheduled-count.is-empty {
  opacity: .55;
}

.onprogram-timeline-view .onprogram-timeline-zoom-control {
  padding: 2px 2px 2px 9px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
  color: var(--text-muted);
}

.onprogram-timeline-view .onprogram-timeline-zoom-control select {
  min-height: 29px;
  border: 0;
  background-color: transparent;
}

.onprogram-timeline-view .onprogram-timeline-unscheduled {
  margin: 0 0 12px;
  border-color: var(--onprogram-polish-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-secondary) 70%, var(--background-primary));
}

.onprogram-timeline-view .onprogram-timeline-shell {
  margin-top: 0;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background: var(--background-primary);
  box-shadow: 0 8px 24px color-mix(in srgb, black 6%, transparent);
  overflow: hidden auto;
}

.onprogram-timeline-view .onprogram-timeline-labels {
  border-right-color: var(--onprogram-polish-border);
  background: var(--background-primary);
}

.onprogram-timeline-view .onprogram-timeline-label-axis,
.onprogram-timeline-view .onprogram-timeline-axis {
  background: color-mix(in srgb, var(--background-secondary) 86%, var(--background-primary));
  border-bottom-color: var(--onprogram-polish-border);
}

.onprogram-timeline-view .onprogram-timeline-band {
  border-color: var(--onprogram-polish-border);
  color: var(--text-normal);
}

.onprogram-timeline-view .onprogram-timeline-tick {
  border-left-color: var(--onprogram-polish-border);
}

.onprogram-timeline-view .onprogram-timeline-gridline {
  background: var(--onprogram-polish-border);
  opacity: .5;
}

.onprogram-timeline-view .onprogram-timeline-label-row,
.onprogram-timeline-view .onprogram-timeline-group-label,
.onprogram-timeline-view .onprogram-timeline-row,
.onprogram-timeline-view .onprogram-timeline-group-row {
  border-bottom-color: var(--onprogram-polish-border);
}

.onprogram-timeline-view .onprogram-timeline-label-row:hover {
  background: color-mix(in srgb, var(--interactive-accent) 4%, var(--background-primary));
}

.onprogram-timeline-view .onprogram-timeline-group-label,
.onprogram-timeline-view .onprogram-timeline-group-row {
  background: color-mix(in srgb, var(--interactive-accent) 5%, var(--background-secondary));
}

.onprogram-timeline-view .onprogram-timeline-group-label {
  color: var(--text-normal);
  font-size: var(--font-ui-small);
}

.onprogram-timeline-view .onprogram-timeline-label-meta {
  padding: 2px 7px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: var(--background-secondary);
}

.onprogram-timeline-view .onprogram-timeline-bar,
.onprogram-timeline-view .onprogram-timeline-point {
  border-color: color-mix(in srgb, var(--interactive-accent) 62%, var(--background-modifier-border));
  border-radius: 999px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--interactive-accent) 76%, var(--background-primary)),
    color-mix(in srgb, var(--interactive-accent) 58%, var(--background-primary)));
  box-shadow: 0 5px 14px color-mix(in srgb, var(--interactive-accent) 18%, transparent);
}

.onprogram-timeline-view .onprogram-timeline-bar:hover,
.onprogram-timeline-view .onprogram-timeline-point:hover {
  filter: brightness(1.08);
  box-shadow: 0 7px 18px color-mix(in srgb, var(--interactive-accent) 25%, transparent);
}

.onprogram-timeline-view .onprogram-timeline-bar-label {
  color: var(--text-on-accent);
}

.onprogram-timeline-view .onprogram-timeline-now-marker {
  width: 2px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--interactive-accent) 65%, transparent);
}

/* --------------------------------------------------------------------------
 * Projects
 * ----------------------------------------------------------------------- */
.onprogram-projects-view .onprogram-projects-index-shell,
.onprogram-projects-view .onprogram-project-detail {
  width: min(1240px, 100%);
  margin-inline: auto;
}

.onprogram-projects-view .onprogram-projects-header,
.onprogram-projects-view .onprogram-project-detail-header {
  padding: 15px 16px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--interactive-accent) 10%, transparent), transparent 46%),
    var(--onprogram-polish-surface);
  box-shadow: 0 8px 22px color-mix(in srgb, black 7%, transparent);
}

.onprogram-projects-view .onprogram-projects-header {
  margin-bottom: 10px;
}

.onprogram-projects-view .onprogram-projects-title-group h3,
.onprogram-projects-view .onprogram-project-detail-heading h2 {
  font-size: clamp(22px, 2.4vw, 30px);
  letter-spacing: -0.025em;
}

.onprogram-projects-view .onprogram-projects-count {
  padding: 4px 9px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-primary) 72%, transparent);
}

.onprogram-projects-view .onprogram-projects-filters {
  width: fit-content;
  gap: 2px;
  margin-bottom: 12px;
  padding: 2px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 10px;
  background: var(--onprogram-polish-surface);
}

.onprogram-projects-view .onprogram-projects-filter {
  border: 0;
  box-shadow: none;
  background: transparent;
}

.onprogram-projects-view .onprogram-projects-filter.is-active {
  background: color-mix(in srgb, var(--interactive-accent) 20%, var(--background-primary));
  color: var(--text-normal);
}

.onprogram-projects-view .onprogram-projects-list {
  gap: 9px;
}

.onprogram-projects-view .onprogram-project-row {
  min-height: 88px;
  padding: 13px 14px;
  border-color: var(--onprogram-polish-border);
  border-radius: 14px;
  background:
    linear-gradient(110deg, color-mix(in srgb, var(--interactive-accent) 4%, transparent), transparent 42%),
    color-mix(in srgb, var(--background-primary) 96%, var(--background-secondary));
  box-shadow: 0 4px 14px color-mix(in srgb, black 5%, transparent);
}

.onprogram-projects-view .onprogram-project-row:hover,
.onprogram-projects-view .onprogram-project-row:focus-visible {
  transform: translateY(-1px);
  border-color: var(--onprogram-polish-border-strong);
  background: color-mix(in srgb, var(--interactive-accent) 5%, var(--background-primary));
  box-shadow: 0 9px 20px color-mix(in srgb, black 8%, transparent);
}

.onprogram-projects-view .onprogram-project-meta span,
.onprogram-projects-view .onprogram-project-detail-heading-meta > span,
.onprogram-projects-view .onprogram-project-detail-heading-meta > button,
.onprogram-projects-view .onprogram-project-task-detail-meta span,
.onprogram-projects-view .onprogram-project-milestone-meta span {
  background: color-mix(in srgb, var(--background-secondary) 76%, transparent);
  border-color: var(--onprogram-polish-border);
}

.onprogram-projects-view .onprogram-project-status-in-progress {
  background: color-mix(in srgb, var(--color-blue) 12%, var(--background-primary));
}
.onprogram-projects-view .onprogram-project-status-done {
  background: color-mix(in srgb, var(--color-green) 12%, var(--background-primary));
}
.onprogram-projects-view .onprogram-project-status-blocked {
  background: color-mix(in srgb, var(--color-red) 12%, var(--background-primary));
}
.onprogram-projects-view .onprogram-project-status-waiting {
  background: color-mix(in srgb, var(--color-yellow) 12%, var(--background-primary));
}

.onprogram-projects-view .onprogram-project-progress-track,
.onprogram-projects-view .onprogram-project-detail-progress-track {
  height: 6px;
  background: color-mix(in srgb, var(--background-modifier-border) 76%, transparent);
}

.onprogram-projects-view .onprogram-project-actions button,
.onprogram-projects-view .onprogram-project-detail-actions button {
  min-height: 30px;
}

.onprogram-projects-view .onprogram-project-detail-breadcrumb button {
  margin-bottom: 3px;
}

.onprogram-projects-view .onprogram-project-summary-progress,
.onprogram-projects-view .onprogram-project-summary-stats,
.onprogram-projects-view .onprogram-project-summary-range {
  border-color: var(--onprogram-polish-border);
  border-radius: 14px;
  background: var(--onprogram-polish-surface);
  box-shadow: 0 5px 16px color-mix(in srgb, black 5%, transparent);
}

.onprogram-projects-view .onprogram-project-summary-metric {
  border-color: var(--onprogram-polish-border);
}

.onprogram-projects-view .onprogram-project-detail-section {
  margin-bottom: 12px;
  padding: 13px 14px 14px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--background-primary) 97%, var(--background-secondary));
  box-shadow: 0 4px 14px color-mix(in srgb, black 4%, transparent);
}

.onprogram-projects-view .onprogram-project-next-row,
.onprogram-projects-view .onprogram-project-task-detail-row,
.onprogram-projects-view .onprogram-project-schedule-row,
.onprogram-projects-view .onprogram-project-milestone-row {
  border-color: var(--onprogram-polish-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--background-secondary) 70%, var(--background-primary));
}

.onprogram-projects-view .onprogram-project-next-row:hover,
.onprogram-projects-view .onprogram-project-task-detail-row:hover,
.onprogram-projects-view .onprogram-project-schedule-row:hover,
.onprogram-projects-view .onprogram-project-milestone-row:hover {
  border-color: var(--onprogram-polish-border-strong);
  background: color-mix(in srgb, var(--interactive-accent) 4%, var(--background-secondary));
}

/* --------------------------------------------------------------------------
 * Generic Bases list
 * ----------------------------------------------------------------------- */
.onprogram-bases-view .onprogram-bases-header {
  padding: 13px 15px;
  border: 1px solid var(--onprogram-polish-border);
  border-radius: var(--onprogram-polish-radius);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--interactive-accent) 9%, transparent), transparent 46%),
    var(--onprogram-polish-surface);
}

.onprogram-bases-view .onprogram-bases-header h3 {
  font-size: clamp(20px, 2vw, 26px);
  letter-spacing: -0.02em;
}

.onprogram-bases-view .onprogram-bases-summary span,
.onprogram-bases-view .onprogram-bases-row-meta span {
  border: 1px solid var(--onprogram-polish-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-secondary) 72%, var(--background-primary));
}

.onprogram-bases-view .onprogram-bases-row {
  border-color: var(--onprogram-polish-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--background-primary) 96%, var(--background-secondary));
  box-shadow: 0 4px 13px color-mix(in srgb, black 4%, transparent);
}

.onprogram-bases-view .onprogram-bases-row:hover {
  border-color: var(--onprogram-polish-border-strong);
  background: color-mix(in srgb, var(--interactive-accent) 4%, var(--background-primary));
}

@media (max-width: 900px) {
  .onprogram-board-view,
  .onprogram-calendar-view,
  .onprogram-timeline-view.onprogram-timeline-view,
  .onprogram-projects-view,
  .onprogram-bases-view {
    padding: 10px !important;
  }

  .onprogram-board-view .onprogram-board-header,
  .onprogram-calendar-view .onprogram-calendar-toolbar,
  .onprogram-timeline-view .onprogram-timeline-toolbar,
  .onprogram-projects-view .onprogram-projects-header,
  .onprogram-projects-view .onprogram-project-detail-header {
    border-radius: 12px;
  }

  .onprogram-timeline-view .onprogram-timeline-toolbar::before {
    flex-basis: 100%;
  }
}

@media (max-width: 640px) {
  .onprogram-board-view .onprogram-board-header,
  .onprogram-calendar-view .onprogram-calendar-toolbar,
  .onprogram-projects-view .onprogram-projects-header {
    align-items: flex-start;
  }

  .onprogram-calendar-view .onprogram-calendar-title {
    flex-basis: 100%;
    order: -1;
    text-align: left;
  }

  .onprogram-projects-view .onprogram-project-row {
    gap: 9px;
  }
}
`;
