export const CALENDAR_STATUS_STYLES = `
.onprogram-calendar-view .onprogram-calendar-item {
  position: relative;
}

/* Timed cards allow the shared badge tray to float just outside the corner. */
.onprogram-calendar-view .onprogram-calendar-timed-item {
  position: absolute;
  overflow: visible;
}

.onprogram-calendar-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 0;
  height: 20px;
  min-height: 20px;
  max-height: 20px;
  box-sizing: border-box;
  margin: 0;
  padding: 1px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--background-primary-alt);
  font-size: var(--font-ui-smallest);
  font-weight: var(--font-semibold);
  line-height: 16px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  pointer-events: none;
}

.onprogram-calendar-item[data-onprogram-status="scheduled"] {
  box-shadow: inset 4px 0 0 var(--color-blue), var(--shadow-s);
}

.onprogram-calendar-item[data-onprogram-status="scheduled"] .onprogram-calendar-status-badge {
  color: var(--color-blue);
  border-color: var(--color-blue);
  background: var(--background-primary);
}

.onprogram-calendar-item[data-onprogram-status="done"] {
  opacity: 0.58;
  filter: saturate(0.55);
}

.onprogram-calendar-item[data-onprogram-status="done"] .onprogram-calendar-item-title {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.onprogram-calendar-item[data-onprogram-status="posted"] {
  box-shadow: inset 4px 0 0 var(--interactive-accent), var(--shadow-s);
  background: var(--background-modifier-hover);
}

.onprogram-calendar-item[data-onprogram-status="posted"] .onprogram-calendar-status-badge {
  color: var(--text-accent);
  border-color: var(--interactive-accent);
  background: var(--background-primary);
}
`;
