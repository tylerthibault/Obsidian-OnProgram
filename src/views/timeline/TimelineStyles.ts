export const TIMELINE_STYLES = `
.onprogram-timeline-view {
  height: 100%; min-height: 0; padding: var(--size-4-4);
  display: flex; flex-direction: column; overflow: hidden;
}
.onprogram-timeline-toolbar, .onprogram-timeline-summary, .onprogram-timeline-zoom {
  display: flex; align-items: center; gap: var(--size-4-2);
}
.onprogram-timeline-toolbar { justify-content: space-between; flex-wrap: wrap; margin-bottom: var(--size-4-3); }
.onprogram-timeline-toolbar h3 { margin: 0; }
.onprogram-timeline-summary { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-timeline-unscheduled {
  margin-bottom: var(--size-4-3); padding: var(--size-4-2) var(--size-4-3);
  border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m);
  background: var(--background-secondary);
}
.onprogram-timeline-unscheduled-list { display: flex; gap: var(--size-4-2); overflow-x: auto; padding-top: var(--size-4-2); }
.onprogram-timeline-shell { display: grid; grid-template-columns: 260px minmax(0, 1fr); flex: 1; min-height: 0; border: 1px solid var(--background-modifier-border); border-radius: var(--radius-m); overflow: hidden; }
.onprogram-timeline-labels { background: var(--background-secondary); overflow: hidden; }
.onprogram-timeline-label-axis { height: 36px; padding: var(--size-4-2); display: flex; align-items: center; color: var(--text-muted); border-bottom: 1px solid var(--background-modifier-border); font-size: var(--font-ui-smaller); }
.onprogram-timeline-group-label, .onprogram-timeline-label-row { height: 42px; box-sizing: border-box; border-bottom: 1px solid var(--background-modifier-border); padding: 0 var(--size-4-2); display: flex; align-items: center; gap: var(--size-4-2); min-width: 0; }
.onprogram-timeline-group-label { font-weight: var(--font-semibold); background: var(--background-secondary-alt); }
.onprogram-timeline-label-row button { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; flex: 1; }
.onprogram-timeline-label-row span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-timeline-scroll { overflow: auto; min-width: 0; min-height: 0; }
.onprogram-timeline-canvas { position: relative; min-height: 100%; background: var(--background-primary); }
.onprogram-timeline-axis { position: sticky; top: 0; height: 36px; z-index: 6; background: var(--background-secondary); border-bottom: 1px solid var(--background-modifier-border); }
.onprogram-timeline-tick { position: absolute; top: 0; height: 36px; padding-left: 4px; display: flex; align-items: center; white-space: nowrap; color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-timeline-gridline { position: absolute; top: 36px; bottom: 0; width: 1px; background: var(--background-modifier-border); pointer-events: none; }
.onprogram-timeline-today-marker { position: absolute; top: 36px; bottom: 0; width: 2px; background: var(--interactive-accent); z-index: 5; pointer-events: none; }
.onprogram-timeline-today-marker span { position: sticky; top: 38px; margin-left: 4px; color: var(--interactive-accent); font-size: var(--font-ui-smaller); font-weight: var(--font-semibold); white-space: nowrap; }
.onprogram-timeline-group-row, .onprogram-timeline-row { position: absolute; left: 0; right: 0; height: 42px; border-bottom: 1px solid var(--background-modifier-border); box-sizing: border-box; }
.onprogram-timeline-group-row { background: color-mix(in srgb, var(--background-secondary) 55%, transparent); }
.onprogram-timeline-bar { position: absolute; top: 8px; height: 26px; min-width: 18px; border-radius: var(--radius-s); background: var(--interactive-accent); color: var(--text-on-accent); display: flex; align-items: center; overflow: visible; cursor: grab; touch-action: none; z-index: 3; }
.onprogram-timeline-bar:active { cursor: grabbing; }
.onprogram-timeline-bar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; pointer-events: none; font-size: var(--font-ui-smaller); }
.onprogram-timeline-resize { position: absolute; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 4; touch-action: none; }
.onprogram-timeline-resize-start { left: -2px; }
.onprogram-timeline-resize-end { right: -2px; }
.onprogram-timeline-resize::after { content: ''; position: absolute; top: 5px; bottom: 5px; width: 2px; background: currentColor; opacity: .55; }
.onprogram-timeline-resize-start::after { left: 3px; }
.onprogram-timeline-resize-end::after { right: 3px; }
.onprogram-timeline-point { position: absolute; top: 8px; width: 26px; height: 26px; margin-left: -13px; display: grid; place-items: center; color: var(--interactive-accent); cursor: grab; touch-action: none; z-index: 4; font-size: 20px; }
.onprogram-timeline-dragging, .onprogram-timeline-resizing { opacity: .65; }
.onprogram-timeline-empty { padding: var(--size-4-4); color: var(--text-muted); }
@media (max-width: 800px) {
  .onprogram-timeline-view { padding: var(--size-4-2); }
  .onprogram-timeline-shell { grid-template-columns: 180px minmax(0, 1fr); }
}
`;
