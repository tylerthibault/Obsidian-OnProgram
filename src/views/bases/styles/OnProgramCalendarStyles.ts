export const CALENDAR_HOUR_HEIGHT = 64;

export const TIMED_CALENDAR_STYLES = `
.onprogram-calendar-week-cell,
.onprogram-calendar-day-slot {
  position: relative;
  overflow: visible;
}

.onprogram-calendar-week-cell:not(.onprogram-calendar-all-day),
.onprogram-calendar-day-slot {
  min-height: ${CALENDAR_HOUR_HEIGHT}px;
  padding: 0;
}

.onprogram-calendar-week-cell:not(.onprogram-calendar-all-day)::after,
.onprogram-calendar-day-slot::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--background-modifier-border);
  opacity: 0.72;
  pointer-events: none;
  z-index: 0;
}

.onprogram-calendar-week-cell:not(.onprogram-calendar-all-day).onprogram-calendar-drop-target::before,
.onprogram-calendar-day-slot.onprogram-calendar-drop-target::before {
  content: attr(data-onprogram-drop-time);
  position: absolute;
  left: 2px;
  right: 2px;
  height: calc(50% - 2px);
  box-sizing: border-box;
  padding: 4px 6px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 62%, var(--background-modifier-border));
  border-top-width: 2px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--interactive-accent) 14%, var(--background-primary));
  color: var(--text-normal);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-semibold);
  line-height: 1;
  pointer-events: none;
  z-index: 3;
}

.onprogram-calendar-week-cell.onprogram-calendar-drop-target[data-onprogram-drop-minute="0"]::before,
.onprogram-calendar-day-slot.onprogram-calendar-drop-target[data-onprogram-drop-minute="0"]::before {
  top: 2px;
}

.onprogram-calendar-week-cell.onprogram-calendar-drop-target[data-onprogram-drop-minute="30"]::before,
.onprogram-calendar-day-slot.onprogram-calendar-drop-target[data-onprogram-drop-minute="30"]::before {
  top: calc(50% + 1px);
}

.onprogram-calendar-timed-item {
  position: absolute;
  left: 4px;
  right: 4px;
  z-index: 4;
  margin: 0;
  padding: 6px 8px;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--background-secondary);
  border-color: var(--interactive-accent);
  box-shadow: var(--shadow-s);
}

.onprogram-calendar-timed-item:hover {
  z-index: 6;
  border-color: var(--interactive-accent-hover);
}

.onprogram-calendar-linked-instance {
  border-style: dashed;
}

.onprogram-calendar-linked-instance .onprogram-calendar-item-title {
  font-style: italic;
}

.onprogram-calendar-timed-time {
  position: absolute;
  left: 8px;
  top: 6px;
  z-index: 2;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.onprogram-calendar-timed-title {
  width: 100%;
  max-width: none;
  padding: 0 58px;
  text-align: center;
  font-weight: var(--font-semibold);
  line-height: 1.35;
}

.onprogram-calendar-timed-continuation {
  border-top-style: dashed;
}

.onprogram-calendar-resize-handle {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 0;
  height: 9px;
  cursor: ns-resize;
  z-index: 8;
}

.onprogram-calendar-resize-handle::after {
  content: "";
  position: absolute;
  left: 35%;
  right: 35%;
  bottom: 2px;
  border-top: 2px solid var(--text-faint);
  border-radius: 999px;
}

.onprogram-calendar-resize-handle:hover::after,
.onprogram-calendar-item-resizing .onprogram-calendar-resize-handle::after {
  border-color: var(--interactive-accent);
}

.onprogram-calendar-item-resizing {
  cursor: ns-resize;
  opacity: 0.92;
  z-index: 10;
}

.onprogram-calendar-resize-preview {
  position: absolute;
  right: 6px;
  bottom: 7px;
  padding: 1px 5px;
  border-radius: var(--radius-s);
  background: var(--background-primary-alt);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  pointer-events: none;
}
`;
