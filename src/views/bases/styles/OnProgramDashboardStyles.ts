export const DASHBOARD_STYLES = `
.onprogram-dashboard-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--size-4-5);
}

.onprogram-dashboard-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
}

.onprogram-dashboard-header,
.onprogram-dashboard-header-actions,
.onprogram-dashboard-stat,
.onprogram-dashboard-panel-header,
.onprogram-dashboard-attention-row,
.onprogram-dashboard-upcoming-row,
.onprogram-dashboard-row-meta,
.onprogram-dashboard-board-column-header,
.onprogram-dashboard-project-top,
.onprogram-dashboard-project-progress-meta,
.onprogram-dashboard-publishing-row,
.onprogram-dashboard-publishing-pills {
  display: flex;
  align-items: center;
}

.onprogram-dashboard-header {
  justify-content: space-between;
  gap: var(--size-4-4);
  margin-bottom: var(--size-4-4);
}

.onprogram-dashboard-heading h2 {
  margin: 0 0 3px;
  font-size: clamp(24px, 3vw, 34px);
}

.onprogram-dashboard-subtitle,
.onprogram-dashboard-panel-subtitle,
.onprogram-dashboard-row-meta,
.onprogram-dashboard-board-card-meta,
.onprogram-dashboard-publishing-date,
.onprogram-dashboard-project-progress-meta,
.onprogram-dashboard-more,
.onprogram-dashboard-column-empty,
.onprogram-dashboard-calendar-empty,
.onprogram-dashboard-calendar-more {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-dashboard-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--size-4-2);
  margin-bottom: var(--size-4-4);
}

.onprogram-dashboard-stat {
  gap: var(--size-4-3);
  min-width: 0;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-secondary);
}

.onprogram-dashboard-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
  font-weight: var(--font-bold);
}

.onprogram-dashboard-stat strong,
.onprogram-dashboard-stat span { display: block; }
.onprogram-dashboard-stat strong { font-size: 22px; line-height: 1.1; }
.onprogram-dashboard-stat span { margin-top: 2px; color: var(--text-muted); font-size: var(--font-ui-smaller); }

.onprogram-dashboard-main-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-4-3);
}

.onprogram-dashboard-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
}

.onprogram-dashboard-panel.is-wide { grid-column: 1 / -1; }

.onprogram-dashboard-panel-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  padding: var(--size-4-3) var(--size-4-4);
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.onprogram-dashboard-panel-header h3 { margin: 0 0 2px; font-size: var(--font-ui-medium); }
.onprogram-dashboard-panel-body { padding: var(--size-4-3); }
.onprogram-dashboard-empty { padding: var(--size-4-4); color: var(--text-muted); text-align: center; }

.onprogram-dashboard-attention-list,
.onprogram-dashboard-upcoming-list,
.onprogram-dashboard-project-list,
.onprogram-dashboard-publishing-list,
.onprogram-dashboard-board-cards {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-dashboard-attention-row,
.onprogram-dashboard-upcoming-row,
.onprogram-dashboard-publishing-row {
  gap: var(--size-4-2);
  min-width: 0;
  padding: var(--size-4-2);
  border-radius: var(--radius-s);
}

.onprogram-dashboard-attention-row:hover,
.onprogram-dashboard-upcoming-row:hover,
.onprogram-dashboard-publishing-row:hover { background: var(--background-modifier-hover); }

.onprogram-dashboard-attention-marker {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--background-modifier-border);
}
.onprogram-dashboard-attention-marker.is-overdue,
.onprogram-dashboard-attention-marker.is-blocked { color: var(--color-red); border-color: var(--color-red); }
.onprogram-dashboard-attention-marker.is-waiting { color: var(--color-yellow); border-color: var(--color-yellow); }

.onprogram-dashboard-item-title,
.onprogram-dashboard-project-title {
  min-width: 0;
  padding: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-normal);
  text-align: left;
  font-weight: var(--font-medium);
}
.onprogram-dashboard-item-title { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.onprogram-dashboard-row-meta { gap: var(--size-4-1); flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; }
.onprogram-dashboard-row-meta span { padding: 1px 6px; border: 1px solid var(--background-modifier-border); border-radius: 999px; }
.onprogram-dashboard-row-meta .is-warning { color: var(--color-red); border-color: var(--color-red); }

.onprogram-dashboard-date-block {
  width: 42px;
  flex: 0 0 42px;
  text-align: center;
  border-right: 1px solid var(--background-modifier-border);
}
.onprogram-dashboard-date-block strong,
.onprogram-dashboard-date-block span { display: block; }
.onprogram-dashboard-date-block strong { font-size: 18px; }
.onprogram-dashboard-date-block span { color: var(--text-muted); font-size: 10px; text-transform: uppercase; }
.onprogram-dashboard-upcoming-main { min-width: 0; flex: 1 1 auto; }

.onprogram-dashboard-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--size-4-2);
}
.onprogram-dashboard-board-column {
  min-width: 0;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-board-column-header {
  justify-content: space-between;
  margin-bottom: var(--size-4-2);
  font-weight: var(--font-semibold);
}
.onprogram-dashboard-count {
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
  text-align: center;
  font-size: var(--font-ui-smaller);
}
.onprogram-dashboard-board-card {
  min-width: 0;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-primary);
}
.onprogram-dashboard-board-card:hover { border-color: var(--background-modifier-border-hover); }
.onprogram-dashboard-board-card-meta { display: flex; gap: var(--size-4-1); flex-wrap: wrap; margin-top: 4px; }
.onprogram-dashboard-board-card-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.onprogram-dashboard-more { margin-top: var(--size-4-2); text-align: center; }
.onprogram-dashboard-column-empty { padding: var(--size-4-3); text-align: center; }

.onprogram-dashboard-calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--size-4-1);
}
.onprogram-dashboard-calendar-day {
  min-width: 0;
  min-height: 128px;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-calendar-day.is-today { border-color: var(--interactive-accent); }
.onprogram-dashboard-calendar-day-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--size-4-2); }
.onprogram-dashboard-calendar-day-header span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-calendar-day-header strong { font-size: 17px; }
.onprogram-dashboard-calendar-day-tasks { display: grid; gap: 4px; }
.onprogram-dashboard-calendar-task {
  width: 100%;
  min-width: 0;
  height: auto;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--background-modifier-border);
  border-radius: 5px;
  background: var(--background-primary);
  box-shadow: none;
  color: var(--text-normal);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.onprogram-dashboard-calendar-more,
.onprogram-dashboard-calendar-empty { padding: 4px; text-align: center; }

.onprogram-dashboard-project-card {
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-project-top,
.onprogram-dashboard-project-progress-meta { justify-content: space-between; gap: var(--size-4-2); }
.onprogram-dashboard-project-title { font-weight: var(--font-semibold); }
.onprogram-dashboard-project-status { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-project-progress-meta { margin-top: var(--size-4-2); color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-project-progress-track {
  height: 7px;
  margin: 6px 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}
.onprogram-dashboard-project-progress-fill { height: 100%; border-radius: inherit; background: var(--interactive-accent); }

.onprogram-dashboard-publishing-main { min-width: 0; flex: 1 1 auto; }
.onprogram-dashboard-publishing-date { margin-top: 2px; }
.onprogram-dashboard-publishing-pills { gap: 4px; flex: 0 0 auto; }
.onprogram-dashboard-publishing-pill {
  min-width: 38px;
  padding: 2px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  text-align: center;
  font-size: 10px;
  font-weight: var(--font-semibold);
}
.onprogram-dashboard-publishing-pill[data-state="scheduled"] { color: var(--color-blue); border-color: var(--color-blue); background: color-mix(in srgb, var(--color-blue) 12%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="posted"] { color: var(--color-green); border-color: var(--color-green); background: color-mix(in srgb, var(--color-green) 12%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="failed"],
.onprogram-dashboard-publishing-pill[data-state="invalid"] { color: var(--color-red); border-color: var(--color-red); background: color-mix(in srgb, var(--color-red) 10%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="skipped"] { opacity: .6; }

.onprogram-dashboard-schema-notice {
  display: grid;
  gap: 2px;
  margin-top: var(--size-4-3);
  padding: var(--size-4-3);
  border: 1px solid var(--color-yellow);
  border-radius: var(--radius-s);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}
.onprogram-dashboard-schema-notice strong { color: var(--text-normal); }

@media (max-width: 980px) {
  .onprogram-dashboard-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .onprogram-dashboard-main-grid { grid-template-columns: 1fr; }
  .onprogram-dashboard-panel.is-wide { grid-column: auto; }
  .onprogram-dashboard-calendar { overflow-x: auto; grid-template-columns: repeat(7, minmax(120px, 1fr)); }
}

@media (max-width: 720px) {
  .onprogram-dashboard-view { padding: var(--size-4-3); }
  .onprogram-dashboard-header { align-items: flex-start; flex-direction: column; }
  .onprogram-dashboard-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onprogram-dashboard-board { grid-template-columns: 1fr; }
  .onprogram-dashboard-attention-row,
  .onprogram-dashboard-publishing-row { align-items: flex-start; flex-wrap: wrap; }
  .onprogram-dashboard-row-meta,
  .onprogram-dashboard-publishing-pills { width: 100%; justify-content: flex-start; padding-left: 30px; }
}

@media (max-width: 460px) {
  .onprogram-dashboard-summary { grid-template-columns: 1fr; }
}
`;
