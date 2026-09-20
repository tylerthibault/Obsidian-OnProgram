export const PROJECT_STYLES = `
.onprogram-projects-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--size-4-4);
}

.onprogram-projects-index-shell,
.onprogram-project-detail {
  width: min(1120px, 100%);
}

.onprogram-projects-header,
.onprogram-projects-title-group,
.onprogram-projects-filters,
.onprogram-project-row,
.onprogram-project-meta,
.onprogram-project-progress-top,
.onprogram-project-actions,
.onprogram-project-row-rollup,
.onprogram-project-detail-header,
.onprogram-project-detail-heading-meta,
.onprogram-project-detail-actions,
.onprogram-project-summary-progress-header,
.onprogram-project-summary-range,
.onprogram-project-detail-section-header,
.onprogram-project-section-actions,
.onprogram-project-next-row,
.onprogram-project-next-meta,
.onprogram-project-task-group-header,
.onprogram-project-task-detail-row,
.onprogram-project-task-detail-actions,
.onprogram-project-task-detail-meta,
.onprogram-project-schedule-row,
.onprogram-project-milestone-row,
.onprogram-project-milestone-meta {
  display: flex;
  align-items: center;
}

.onprogram-projects-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}

.onprogram-projects-title-group {
  gap: var(--size-4-2);
}

.onprogram-projects-title-group h3 {
  margin: 0;
}

.onprogram-projects-count,
.onprogram-project-meta,
.onprogram-project-progress-top,
.onprogram-project-detail-section-description,
.onprogram-project-progress-explainer,
.onprogram-project-next-meta,
.onprogram-project-task-detail-meta,
.onprogram-project-schedule-status,
.onprogram-project-milestone-meta,
.onprogram-project-row-rollup,
.onprogram-project-summary-range,
.onprogram-project-detail-property span {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-projects-filters {
  gap: var(--size-4-1);
  margin-bottom: var(--size-4-3);
}

.onprogram-projects-filter.is-active {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.onprogram-projects-list {
  display: grid;
  gap: var(--size-4-2);
}

.onprogram-project-row {
  gap: var(--size-4-4);
  min-height: 82px;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
  cursor: pointer;
}

.onprogram-project-row:hover,
.onprogram-project-row:focus-visible {
  background: var(--background-modifier-hover);
  border-color: var(--background-modifier-border-hover);
  outline: none;
}

.onprogram-project-identity {
  flex: 1 1 32%;
  min-width: 190px;
}

.onprogram-project-title,
.onprogram-project-next-title,
.onprogram-project-task-detail-title,
.onprogram-project-schedule-title,
.onprogram-project-milestone-title {
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-normal);
  text-align: left;
}

.onprogram-project-title {
  display: block;
  width: 100%;
  padding: 0;
  font-weight: var(--font-semibold);
  font-size: var(--font-ui-medium);
}

.onprogram-project-meta {
  gap: var(--size-4-1);
  flex-wrap: wrap;
  margin-top: 5px;
}

.onprogram-project-meta span,
.onprogram-project-detail-heading-meta > span,
.onprogram-project-detail-heading-meta > button,
.onprogram-project-task-detail-meta span,
.onprogram-project-milestone-meta span {
  padding: 2px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
}

.onprogram-project-status {
  background: transparent;
  box-shadow: none;
}

.onprogram-project-status-in-progress { color: var(--color-blue); border-color: var(--color-blue) !important; }
.onprogram-project-status-done { color: var(--color-green); border-color: var(--color-green) !important; }
.onprogram-project-status-blocked { color: var(--color-red); border-color: var(--color-red) !important; }
.onprogram-project-status-waiting { color: var(--color-yellow); border-color: var(--color-yellow) !important; }

.onprogram-project-progress {
  flex: 1 1 42%;
  min-width: 220px;
}

.onprogram-project-progress-top {
  justify-content: space-between;
  gap: var(--size-4-2);
  margin-bottom: 6px;
}

.onprogram-project-progress-count { font-variant-numeric: tabular-nums; }

.onprogram-project-progress-track,
.onprogram-project-detail-progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}

.onprogram-project-progress-fill,
.onprogram-project-detail-progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--interactive-accent);
  transition: width 160ms ease;
}

.onprogram-project-row-rollup {
  gap: var(--size-4-2);
  flex-wrap: wrap;
  margin-top: 6px;
}

.onprogram-project-actions {
  justify-content: flex-end;
  gap: var(--size-4-1);
  flex: 0 0 auto;
}

.onprogram-project-tasks-button,
.onprogram-project-base-button,
.onprogram-project-more { white-space: nowrap; }
.onprogram-project-tasks-button { font-variant-numeric: tabular-nums; }

.onprogram-projects-empty,
.onprogram-projects-empty-filter,
.onprogram-project-detail-empty {
  padding: var(--size-4-5) var(--size-4-4);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
}

.onprogram-projects-empty,
.onprogram-projects-empty-filter { text-align: center; }
.onprogram-projects-empty strong {
  display: block;
  margin-bottom: var(--size-4-2);
  color: var(--text-normal);
  font-size: var(--font-ui-medium);
}
.onprogram-projects-empty button { margin-top: var(--size-4-3); }

.onprogram-project-detail-breadcrumb { margin-bottom: var(--size-4-3); }
.onprogram-project-detail-breadcrumb button {
  padding-left: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text-muted);
}

.onprogram-project-detail-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--size-4-4);
  margin-bottom: var(--size-4-4);
}

.onprogram-project-detail-heading { min-width: 0; }
.onprogram-project-detail-heading h2 {
  margin: 0 0 var(--size-4-2);
  font-size: var(--font-text-size);
  font-size: clamp(24px, 3vw, 34px);
}

.onprogram-project-detail-heading-meta {
  gap: var(--size-4-1);
  flex-wrap: wrap;
}

.onprogram-project-detail-actions {
  gap: var(--size-4-1);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-project-summary {
  display: grid;
  grid-template-columns: minmax(280px, 1.5fr) minmax(320px, 1fr);
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-5);
}

.onprogram-project-summary-progress,
.onprogram-project-summary-stats,
.onprogram-project-summary-range {
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-secondary);
}

.onprogram-project-summary-progress { padding: var(--size-4-4); }
.onprogram-project-summary-progress-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-eyebrow {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.onprogram-project-progress-explainer { margin-top: var(--size-4-2); line-height: 1.45; }

.onprogram-project-summary-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}
.onprogram-project-summary-metric {
  padding: var(--size-4-3);
  border-right: 1px solid var(--background-modifier-border);
  border-bottom: 1px solid var(--background-modifier-border);
}
.onprogram-project-summary-metric:nth-child(2n) { border-right: 0; }
.onprogram-project-summary-metric:nth-last-child(-n + 2) { border-bottom: 0; }
.onprogram-project-summary-metric strong {
  display: block;
  font-size: 22px;
  line-height: 1.2;
}
.onprogram-project-summary-metric span { color: var(--text-muted); font-size: var(--font-ui-smaller); }

.onprogram-project-summary-range {
  grid-column: 1 / -1;
  gap: var(--size-4-4);
  padding: var(--size-4-2) var(--size-4-3);
}

.onprogram-project-detail-section {
  margin: 0 0 var(--size-4-5);
  padding-top: var(--size-4-4);
  border-top: 1px solid var(--background-modifier-border);
}
.onprogram-project-detail-section-header {
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-detail-section-header h3 { margin: 0 0 2px; }
.onprogram-project-detail-section-description { line-height: 1.35; }
.onprogram-project-section-actions { gap: var(--size-4-1); }

.onprogram-project-next-list,
.onprogram-project-task-list,
.onprogram-project-schedule-list,
.onprogram-project-milestone-list {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-project-next-row,
.onprogram-project-task-detail-row,
.onprogram-project-schedule-row,
.onprogram-project-milestone-row {
  gap: var(--size-4-2);
  min-width: 0;
  padding: var(--size-4-2) var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}

.onprogram-project-next-marker { color: var(--interactive-accent); }
.onprogram-project-next-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--font-medium);
}
.onprogram-project-next-meta { gap: var(--size-4-2); flex-wrap: wrap; justify-content: flex-end; }

.onprogram-project-inline-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--size-4-2);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-inline-composer input { width: 100%; }

.onprogram-project-task-group { margin-top: var(--size-4-3); }
.onprogram-project-task-group-header {
  justify-content: space-between;
  margin-bottom: var(--size-4-2);
}
.onprogram-project-task-group-header h4 { margin: 0; }
.onprogram-project-task-group-header span,
.onprogram-project-task-group-count { color: var(--text-muted); }
.onprogram-project-task-group-collapsible > summary {
  display: flex;
  gap: var(--size-4-2);
  align-items: center;
  cursor: pointer;
  font-weight: var(--font-semibold);
  margin-bottom: var(--size-4-2);
}

.onprogram-project-task-detail-row > input[type="checkbox"] {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.onprogram-project-task-detail-main,
.onprogram-project-milestone-main { flex: 1 1 auto; min-width: 0; }
.onprogram-project-task-detail-title,
.onprogram-project-milestone-title,
.onprogram-project-schedule-title {
  display: block;
  width: 100%;
  padding: 0;
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.onprogram-project-task-detail-title.is-complete {
  color: var(--text-muted);
  text-decoration: line-through;
}
.onprogram-project-task-detail-meta,
.onprogram-project-milestone-meta { gap: var(--size-4-1); flex-wrap: wrap; margin-top: 3px; }
.onprogram-project-task-detail-actions { gap: var(--size-4-1); flex: 0 0 auto; }
.onprogram-project-task-detail-meta .is-status-blocked { color: var(--color-red); }
.onprogram-project-task-detail-meta .is-status-in-progress { color: var(--color-blue); }
.onprogram-project-task-detail-meta .is-status-done,
.onprogram-project-task-detail-meta .is-status-posted { color: var(--color-green); }

.onprogram-project-schedule-row { grid-template-columns: 150px minmax(0, 1fr) auto; }
.onprogram-project-schedule-date { display: grid; }
.onprogram-project-schedule-date span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-project-schedule-status { white-space: nowrap; }
.onprogram-project-detail-more { color: var(--text-muted); padding: var(--size-4-2); }

.onprogram-project-milestone-marker {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--background-modifier-border);
  border-radius: 50%;
  color: var(--text-muted);
}
.onprogram-project-milestone-marker.is-done { color: var(--color-green); border-color: var(--color-green); }

.onprogram-project-notes-preview {
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  line-height: 1.55;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-project-notes-preview.is-empty { color: var(--text-muted); }

.onprogram-project-details-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  overflow: hidden;
}
.onprogram-project-detail-property {
  min-width: 0;
  padding: var(--size-4-3);
  border-right: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}
.onprogram-project-detail-property:last-child { border-right: 0; }
.onprogram-project-detail-property span,
.onprogram-project-detail-property strong { display: block; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 900px) {
  .onprogram-project-summary { grid-template-columns: 1fr; }
  .onprogram-project-summary-range { grid-column: auto; }
  .onprogram-project-details-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onprogram-project-detail-property { border-bottom: 1px solid var(--background-modifier-border); }
  .onprogram-project-schedule-row { grid-template-columns: 120px minmax(0, 1fr); }
  .onprogram-project-schedule-status { grid-column: 2; }
}

@media (max-width: 760px) {
  .onprogram-project-row,
  .onprogram-project-detail-header,
  .onprogram-project-task-detail-row,
  .onprogram-project-milestone-row {
    align-items: stretch;
    flex-direction: column;
  }
  .onprogram-project-identity,
  .onprogram-project-progress { min-width: 0; width: 100%; }
  .onprogram-project-actions,
  .onprogram-project-detail-actions,
  .onprogram-project-task-detail-actions { justify-content: flex-start; }
  .onprogram-project-inline-composer { grid-template-columns: 1fr; }
  .onprogram-project-next-row { align-items: flex-start; flex-wrap: wrap; }
  .onprogram-project-next-meta { width: 100%; justify-content: flex-start; padding-left: 26px; }
}

@media (max-width: 520px) {
  .onprogram-projects-view { padding: var(--size-4-2); }
  .onprogram-project-summary-stats,
  .onprogram-project-details-grid { grid-template-columns: 1fr; }
  .onprogram-project-summary-metric,
  .onprogram-project-detail-property { border-right: 0; border-bottom: 1px solid var(--background-modifier-border); }
  .onprogram-project-summary-metric:last-child,
  .onprogram-project-detail-property:last-child { border-bottom: 0; }
  .onprogram-project-schedule-row { display: flex; align-items: flex-start; flex-direction: column; }
}
`;
