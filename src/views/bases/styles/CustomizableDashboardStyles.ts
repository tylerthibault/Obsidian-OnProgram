export const LAYOUT_STYLES = `
.onprogram-dashboard-view {
  padding: clamp(14px, 1.7vw, 26px) !important;
  background:
    radial-gradient(circle at 12% -8%, color-mix(in srgb, var(--interactive-accent) 7%, transparent), transparent 30%),
    var(--background-primary);
}

.onprogram-dashboard-shell {
  width: min(1480px, 100%) !important;
  margin: 0 auto;
}

.onprogram-dashboard-shell[data-dashboard-width="full"] {
  width: 100% !important;
  max-width: none !important;
}

/* Hero */
.onprogram-dashboard-header {
  position: relative;
  isolation: isolate;
  min-height: 142px;
  margin-bottom: 14px !important;
  padding: 22px 24px !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 20%, var(--background-modifier-border));
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 12%, color-mix(in srgb, var(--interactive-accent) 18%, transparent), transparent 31%),
    linear-gradient(118deg,
      color-mix(in srgb, var(--background-secondary) 86%, var(--interactive-accent) 14%),
      color-mix(in srgb, var(--background-primary) 94%, var(--interactive-accent) 6%) 54%,
      var(--background-secondary));
  box-shadow: 0 14px 34px rgba(0, 0, 0, .10);
}

.onprogram-dashboard-header::before,
.onprogram-dashboard-header::after {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.onprogram-dashboard-header::before {
  inset: auto -4% -58% 42%;
  height: 132%;
  opacity: .45;
  transform: rotate(-4deg);
  background:
    linear-gradient(135deg, transparent 47%, color-mix(in srgb, var(--interactive-accent) 15%, transparent) 47% 50%, transparent 50%),
    linear-gradient(45deg, transparent 42%, color-mix(in srgb, var(--text-faint) 12%, transparent) 42% 48%, transparent 48%);
}

.onprogram-dashboard-header::after {
  inset: 0;
  background: linear-gradient(90deg, transparent 0 58%, color-mix(in srgb, var(--background-primary) 5%, transparent));
}

.onprogram-dashboard-heading {
  position: relative;
  z-index: 1;
  max-width: 680px;
}

.onprogram-dashboard-eyebrow {
  margin-bottom: 8px;
  color: var(--interactive-accent);
  font-size: 10px;
  font-weight: var(--font-semibold);
  letter-spacing: .13em;
  text-transform: uppercase;
}

.onprogram-dashboard-heading h2 {
  margin: 0 0 7px !important;
  font-size: clamp(30px, 3vw, 42px) !important;
  line-height: 1.04;
  letter-spacing: -.03em;
}

.onprogram-dashboard-subtitle {
  color: color-mix(in srgb, var(--text-muted) 88%, var(--text-normal));
  font-size: var(--font-ui-small) !important;
}

.onprogram-dashboard-header-actions {
  position: relative;
  z-index: 1;
  align-self: flex-end;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.onprogram-dashboard-header-actions > button,
.onprogram-dashboard-layout-controls > button {
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 76%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--background-primary) 74%, transparent);
  box-shadow: none;
  backdrop-filter: blur(8px);
}

/* Summary row */
.onprogram-dashboard-main-grid > .onprogram-dashboard-summary {
  grid-column: 1 / -1;
  margin-bottom: 0 !important;
}

.onprogram-dashboard-summary {
  gap: 12px !important;
}

.onprogram-dashboard-stat {
  position: relative;
  min-height: 76px;
  padding: 13px 14px !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 16%, var(--background-modifier-border)) !important;
  border-radius: 13px !important;
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--background-secondary) 88%, var(--interactive-accent) 12%),
      color-mix(in srgb, var(--background-primary) 96%, var(--interactive-accent) 4%)) !important;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-normal) 4%, transparent);
}

.onprogram-dashboard-stat::after {
  content: "";
  position: absolute;
  inset: auto 14px 0 56px;
  height: 2px;
  border-radius: 999px;
  opacity: .55;
  background: linear-gradient(90deg, transparent, var(--interactive-accent), transparent);
}

.onprogram-dashboard-stat-icon {
  width: 39px !important;
  height: 39px !important;
  flex-basis: 39px !important;
  border-radius: 10px !important;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 22%, transparent);
  background: color-mix(in srgb, var(--interactive-accent) 14%, transparent) !important;
  box-shadow: inset 0 0 18px color-mix(in srgb, var(--interactive-accent) 5%, transparent);
}

.onprogram-dashboard-stat strong {
  font-size: 24px !important;
  letter-spacing: -.025em;
}

.onprogram-dashboard-stat span {
  margin-top: 1px !important;
  font-size: 11px !important;
}

/* Main composition */
.onprogram-dashboard-main-grid {
  gap: 14px !important;
}

.onprogram-dashboard-panel {
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 82%, var(--interactive-accent) 18%) !important;
  border-radius: 14px !important;
  background: color-mix(in srgb, var(--background-primary) 84%, var(--background-secondary) 16%) !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, .055);
}

.onprogram-dashboard-panel-header {
  justify-content: flex-start !important;
  gap: 10px;
  padding: 13px 15px 10px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 58%, transparent);
}

.onprogram-dashboard-panel-header > div:not(.onprogram-dashboard-section-icon) {
  min-width: 0;
}

.onprogram-dashboard-panel-header h3 {
  margin: 0 0 1px !important;
  font-size: 13px !important;
  font-weight: var(--font-semibold);
  letter-spacing: -.01em;
}

.onprogram-dashboard-panel-subtitle {
  font-size: 10px !important;
  line-height: 1.35;
}

.onprogram-dashboard-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  flex: 0 0 29px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 18%, transparent);
  border-radius: 9px;
  color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 11%, transparent);
  font-size: 13px;
  font-weight: var(--font-bold);
}

.onprogram-dashboard-panel-body {
  padding: 11px 14px 14px !important;
}

/* Needs attention */
.onprogram-dashboard-attention-list,
.onprogram-dashboard-upcoming-list,
.onprogram-dashboard-project-list,
.onprogram-dashboard-publishing-list {
  gap: 0 !important;
}

.onprogram-dashboard-attention-row {
  display: grid !important;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px !important;
  min-height: 34px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-attention-row:last-child,
.onprogram-dashboard-upcoming-row:last-child,
.onprogram-dashboard-publishing-row:last-child {
  border-bottom: 0;
}

.onprogram-dashboard-attention-marker {
  width: 8px !important;
  height: 8px !important;
  min-width: 8px;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 999px !important;
  color: transparent !important;
}

.onprogram-dashboard-attention-marker.is-overdue { background: var(--text-error) !important; }
.onprogram-dashboard-attention-marker.is-blocked { background: var(--color-orange) !important; }
.onprogram-dashboard-attention-marker.is-waiting { background: var(--color-yellow) !important; }

.onprogram-dashboard-item-title {
  min-width: 0;
  padding-inline: 8px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px !important;
  font-weight: var(--font-medium);
}

.onprogram-dashboard-attention-row .onprogram-dashboard-row-meta {
  justify-content: flex-end;
  white-space: nowrap;
  font-size: 9px !important;
}

/* Up next */
.onprogram-dashboard-upcoming-row {
  gap: 10px !important;
  min-height: 39px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-date-block {
  width: 42px !important;
  min-width: 42px !important;
  height: 31px;
  padding: 3px 5px !important;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 16%, var(--background-modifier-border));
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--interactive-accent) 6%, var(--background-secondary));
}

.onprogram-dashboard-date-block strong {
  font-size: 11px !important;
  line-height: 1;
}

.onprogram-dashboard-date-block span {
  font-size: 8px !important;
}

.onprogram-dashboard-upcoming-main {
  min-width: 0;
}

.onprogram-dashboard-upcoming-main .onprogram-dashboard-row-meta {
  margin-top: 2px;
  font-size: 9px !important;
}

/* Board */
.onprogram-dashboard-board {
  gap: 11px !important;
}

.onprogram-dashboard-board-column {
  padding: 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent) !important;
  border-radius: 11px !important;
  background: color-mix(in srgb, var(--background-secondary) 64%, transparent) !important;
}

.onprogram-dashboard-board-column-header {
  margin-bottom: 7px;
  font-size: 10px !important;
  font-weight: var(--font-semibold);
}

.onprogram-dashboard-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
  font-size: 9px;
}

.onprogram-dashboard-board-cards {
  gap: 6px !important;
}

.onprogram-dashboard-board-card {
  min-height: 38px;
  padding: 8px 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 68%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--background-primary) 88%, var(--background-secondary) 12%) !important;
  box-shadow: none !important;
}

.onprogram-dashboard-board-card-meta {
  margin-top: 4px !important;
  font-size: 8px !important;
}

/* Calendar strip */
.onprogram-dashboard-calendar {
  gap: 9px !important;
}

.onprogram-dashboard-calendar-day {
  min-height: 90px !important;
  padding: 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent) !important;
  border-radius: 10px !important;
  background: color-mix(in srgb, var(--background-secondary) 46%, transparent) !important;
}

.onprogram-dashboard-calendar-day.is-today {
  border-color: color-mix(in srgb, var(--interactive-accent) 70%, var(--background-modifier-border)) !important;
  background: color-mix(in srgb, var(--interactive-accent) 7%, var(--background-secondary)) !important;
  box-shadow: inset 0 -2px 0 var(--interactive-accent);
}

.onprogram-dashboard-calendar-day-header {
  margin-bottom: 7px !important;
}

.onprogram-dashboard-calendar-day-header span {
  font-size: 9px !important;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.onprogram-dashboard-calendar-day-header strong {
  font-size: 15px !important;
}

.onprogram-dashboard-calendar-day-tasks {
  gap: 4px !important;
}

.onprogram-dashboard-calendar-task {
  padding: 3px 5px !important;
  border-radius: 5px !important;
  font-size: 8px !important;
  line-height: 1.15;
}

/* Projects */
.onprogram-dashboard-project-card {
  padding: 8px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-project-card:last-child { border-bottom: 0; }

.onprogram-dashboard-project-top {
  gap: 8px;
}

.onprogram-dashboard-project-title {
  font-size: 11px !important;
  font-weight: var(--font-medium) !important;
}

.onprogram-dashboard-project-status {
  padding: 2px 6px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--interactive-accent) 8%, var(--background-secondary));
  font-size: 8px !important;
}

.onprogram-dashboard-project-progress-meta {
  margin: 5px 0 3px !important;
  font-size: 8px !important;
}

.onprogram-dashboard-project-progress-track {
  height: 4px !important;
  border-radius: 999px !important;
  background: var(--background-modifier-border) !important;
}

.onprogram-dashboard-project-progress-fill {
  border-radius: 999px !important;
  background: var(--interactive-accent) !important;
}

.onprogram-dashboard-project-card .onprogram-dashboard-row-meta {
  margin-top: 4px;
  font-size: 8px !important;
}

/* Publishing */
.onprogram-dashboard-publishing-row {
  min-height: 35px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-publishing-main {
  min-width: 0;
}

.onprogram-dashboard-publishing-date {
  margin-top: 2px;
  font-size: 8px !important;
}

.onprogram-dashboard-publishing-pills {
  gap: 4px !important;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-dashboard-publishing-pill {
  padding: 2px 6px !important;
  border-radius: 999px !important;
  font-size: 8px !important;
}

/* Layout controls */
.onprogram-dashboard-layout-controls,
.onprogram-dashboard-layout-width,
.onprogram-dashboard-customizer-header,
.onprogram-dashboard-customizer-row,
.onprogram-dashboard-customizer-controls,
.onprogram-dashboard-customizer-visibility,
.onprogram-dashboard-customizer-move {
  display: flex;
  align-items: center;
}

.onprogram-dashboard-layout-controls {
  gap: 7px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-dashboard-layout-width {
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--background-primary) 68%, transparent);
  backdrop-filter: blur(8px);
}

.onprogram-dashboard-layout-width button {
  height: 27px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  box-shadow: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
}

.onprogram-dashboard-layout-width button.is-active {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

/* Customizer */
.onprogram-dashboard-customizer {
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 65%, var(--background-modifier-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--interactive-accent) 4%, var(--background-primary));
  box-shadow: 0 8px 22px rgba(0, 0, 0, .05);
}

.onprogram-dashboard-customizer-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.onprogram-dashboard-customizer-header h3 { margin: 0 0 2px; }
.onprogram-dashboard-customizer-description,
.onprogram-dashboard-customizer-identity span,
.onprogram-dashboard-customizer-fixed {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-dashboard-customizer-list {
  display: grid;
  gap: 5px;
}

.onprogram-dashboard-customizer-row {
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 9px;
  background: var(--background-primary);
}

.onprogram-dashboard-customizer-row.is-dragging { opacity: .5; }
.onprogram-dashboard-customizer-row.is-drop-target { border-color: var(--interactive-accent); }

.onprogram-dashboard-customizer-handle {
  flex: 0 0 auto;
  color: var(--text-faint);
  cursor: grab;
  font-weight: var(--font-bold);
  letter-spacing: -3px;
}

.onprogram-dashboard-customizer-identity {
  flex: 1 1 auto;
  min-width: 160px;
}

.onprogram-dashboard-customizer-identity strong,
.onprogram-dashboard-customizer-identity span { display: block; }
.onprogram-dashboard-customizer-controls { gap: 8px; flex: 0 0 auto; }
.onprogram-dashboard-customizer-visibility { gap: 6px; color: var(--text-muted); }
.onprogram-dashboard-customizer-move { gap: 2px; }
.onprogram-dashboard-customizer-move button { min-width: 32px; padding: 0 8px; }
.onprogram-dashboard-customizer-fixed { min-width: 82px; text-align: center; }

.onprogram-dashboard-section-hidden { display: none !important; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-board { grid-template-columns: 1fr; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-calendar {
  overflow-x: auto;
  grid-template-columns: repeat(7, minmax(105px, 1fr));
}

.onprogram-dashboard-all-hidden-layout {
  grid-column: 1 / -1;
  padding: 24px;
  border: 1px dashed var(--background-modifier-border);
  border-radius: 14px;
  color: var(--text-muted);
  text-align: center;
}
.onprogram-dashboard-all-hidden-layout strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-normal);
}

@media (max-width: 1100px) {
  .onprogram-dashboard-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .onprogram-dashboard-header {
    min-height: 124px;
    align-items: flex-start !important;
  }
}

@media (max-width: 820px) {
  .onprogram-dashboard-header {
    min-height: 0;
    flex-direction: column;
  }
  .onprogram-dashboard-header-actions {
    width: 100%;
    align-self: auto;
    justify-content: flex-start;
  }
  .onprogram-dashboard-layout-controls { justify-content: flex-start; }
  .onprogram-dashboard-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .onprogram-dashboard-main-grid {
    grid-template-columns: 1fr !important;
  }
  .onprogram-dashboard-main-grid > .onprogram-dashboard-summary,
  .onprogram-dashboard-panel.is-wide {
    grid-column: auto !important;
  }
}

@media (max-width: 620px) {
  .onprogram-dashboard-view { padding: 10px !important; }
  .onprogram-dashboard-header { padding: 17px !important; }
  .onprogram-dashboard-summary { grid-template-columns: 1fr !important; }
  .onprogram-dashboard-customizer-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .onprogram-dashboard-customizer-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .onprogram-dashboard-customizer-controls {
    width: calc(100% - 24px);
    margin-left: 24px;
    flex-wrap: wrap;
  }
  .onprogram-dashboard-attention-row {
    grid-template-columns: 18px minmax(0, 1fr);
  }
  .onprogram-dashboard-attention-row .onprogram-dashboard-row-meta {
    grid-column: 2;
    justify-content: flex-start;
  }
}
`;
