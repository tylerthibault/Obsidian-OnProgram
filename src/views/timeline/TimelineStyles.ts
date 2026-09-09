export const TIMELINE_STYLES = `
.onprogram-timeline-view {
  --onprogram-timeline-label-width: 360px;
  --onprogram-timeline-row-height: 44px;
  --onprogram-timeline-axis-height: 62px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background-primary);
}

.onprogram-timeline-toolbar {
  display: flex;
  align-items: center;
  gap: var(--size-4-2);
  flex-wrap: wrap;
  padding: var(--size-4-2) var(--size-4-3);
  border-bottom: 1px solid var(--background-modifier-border);
}

.onprogram-timeline-spacer {
  flex: 1;
}

.onprogram-timeline-unscheduled-count {
  color: var(--text-muted);
  white-space: nowrap;
}

.onprogram-timeline-zoom-control {
  display: flex;
  align-items: center;
  gap: var(--size-4-1);
}

.onprogram-timeline-zoom-control select {
  min-width: 116px;
}

.onprogram-timeline-unscheduled {
  margin: var(--size-4-2) var(--size-4-3) 0;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-secondary);
}

.onprogram-timeline-unscheduled summary {
  cursor: pointer;
  padding: var(--size-4-2) var(--size-4-3);
}

.onprogram-timeline-unscheduled-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--size-4-1);
  padding: 0 var(--size-4-3) var(--size-4-3);
}

.onprogram-timeline-shell {
  display: grid;
  grid-template-columns: minmax(220px, var(--onprogram-timeline-label-width)) minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: var(--size-4-2);
  border-top: 1px solid var(--background-modifier-border);
}

.onprogram-timeline-labels {
  position: relative;
  z-index: 4;
  background: var(--background-primary);
  border-right: 1px solid var(--background-modifier-border);
}

.onprogram-timeline-label-axis {
  height: var(--onprogram-timeline-axis-height);
  display: flex;
  align-items: end;
  padding: 0 var(--size-4-3) 8px;
  box-sizing: border-box;
  font-size: var(--font-ui-smaller);
  color: var(--text-muted);
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  position: sticky;
  top: 0;
  z-index: 8;
}

.onprogram-timeline-label-row,
.onprogram-timeline-group-label {
  height: var(--onprogram-timeline-row-height);
  border-bottom: 1px solid var(--background-modifier-border);
  box-sizing: border-box;
}

.onprogram-timeline-label-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--size-4-2);
  padding: 0 var(--size-4-3);
}

.onprogram-timeline-label-row button {
  border: 0;
  box-shadow: none;
  background: transparent;
  min-width: 0;
  padding: 0;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-weight: var(--font-semibold);
}

.onprogram-timeline-label-meta {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  white-space: nowrap;
}

.onprogram-timeline-group-label {
  display: flex;
  align-items: center;
  padding: 0 var(--size-4-3);
  font-weight: var(--font-semibold);
  background: var(--background-secondary);
}

.onprogram-timeline-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  min-width: 0;
  scrollbar-gutter: stable;
}

.onprogram-timeline-canvas {
  position: relative;
  min-width: 100%;
  background: var(--background-primary);
}

.onprogram-timeline-axis {
  position: sticky;
  top: 0;
  height: var(--onprogram-timeline-axis-height);
  z-index: 7;
  background: var(--background-secondary);
  border-bottom: 1px solid var(--background-modifier-border);
  overflow: hidden;
}

.onprogram-timeline-band {
  position: absolute;
  top: 0;
  height: 30px;
  border-right: 1px solid var(--background-modifier-border);
  border-bottom: 1px solid var(--background-modifier-border);
  padding: 5px 10px;
  box-sizing: border-box;
  font-weight: var(--font-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.onprogram-timeline-tick {
  position: absolute;
  top: 30px;
  height: 32px;
  border-left: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  white-space: nowrap;
}

.onprogram-timeline-tick span {
  display: inline-block;
  transform: translateX(6px);
  padding-top: 7px;
}

.onprogram-timeline-gridline {
  position: absolute;
  top: var(--onprogram-timeline-axis-height);
  bottom: 0;
  width: 1px;
  background: var(--background-modifier-border);
  opacity: 0.55;
  pointer-events: none;
}

.onprogram-timeline-row,
.onprogram-timeline-group-row {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--onprogram-timeline-row-height);
  border-bottom: 1px solid var(--background-modifier-border);
  box-sizing: border-box;
}

.onprogram-timeline-group-row {
  background: var(--background-secondary);
}

.onprogram-timeline-bar,
.onprogram-timeline-point {
  position: absolute;
  top: 7px;
  height: 30px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 75%, white 25%);
  background: color-mix(in srgb, var(--interactive-accent) 70%, var(--background-primary) 30%);
  box-sizing: border-box;
  cursor: grab;
  box-shadow: var(--shadow-s);
  touch-action: none;
}

.onprogram-timeline-bar:active,
.onprogram-timeline-point:active {
  cursor: grabbing;
}

.onprogram-timeline-point {
  width: 28px;
  min-width: 28px;
}

.onprogram-timeline-bar-label {
  position: absolute;
  inset: 0 12px;
  display: flex;
  align-items: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-semibold);
  color: var(--text-on-accent);
  pointer-events: none;
}

.onprogram-timeline-resize {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: ew-resize;
  z-index: 2;
}

.onprogram-timeline-resize-start {
  left: 0;
}

.onprogram-timeline-resize-end {
  right: 0;
}

.onprogram-timeline-dragging,
.onprogram-timeline-resizing {
  opacity: 0.72;
}

.onprogram-timeline-now-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--interactive-accent);
  z-index: 6;
  pointer-events: none;
}

.onprogram-timeline-now-marker span {
  position: sticky;
  top: 2px;
  display: inline-block;
  transform: translateX(4px);
  padding: 2px 5px;
  border-radius: var(--radius-s);
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  font-size: var(--font-ui-smaller);
  white-space: nowrap;
}

.onprogram-timeline-empty {
  padding: var(--size-4-5) var(--size-4-3);
  color: var(--text-muted);
}

@media (max-width: 800px) {
  .onprogram-timeline-view {
    --onprogram-timeline-label-width: 240px;
  }

  .onprogram-timeline-shell {
    grid-template-columns: minmax(180px, var(--onprogram-timeline-label-width)) minmax(0, 1fr);
  }
}
`;
