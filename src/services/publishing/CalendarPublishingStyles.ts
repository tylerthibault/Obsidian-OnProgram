export const PUBLISHING_STYLES = `
.onprogram-calendar-publishing-tray {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  min-width: 0;
  z-index: 12;
  pointer-events: none;
}

.onprogram-calendar-timed-item > .onprogram-calendar-publishing-tray {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 3px;
  min-height: 18px;
  justify-content: flex-start;
  overflow: hidden;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-publishing-tray {
  margin-top: 4px;
  min-height: 18px;
  justify-content: flex-start;
}

.onprogram-calendar-publishing-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 34px;
  height: 18px;
  min-height: 18px;
  margin: 0;
  padding: 0 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--background-primary-alt);
  font-size: 10px;
  font-weight: var(--font-semibold);
  line-height: 16px;
  white-space: nowrap;
}

.onprogram-calendar-publishing-pill[data-state="planned"] {
  border-color: var(--text-faint);
  color: var(--text-muted);
}

.onprogram-calendar-publishing-pill[data-state="scheduled"] {
  border-color: var(--color-blue);
  color: var(--color-blue);
  background: color-mix(in srgb, var(--color-blue) 12%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="posted"] {
  border-color: var(--color-green);
  color: var(--color-green);
  background: color-mix(in srgb, var(--color-green) 12%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="failed"],
.onprogram-calendar-publishing-pill[data-state="invalid"] {
  border-color: var(--color-red);
  color: var(--color-red);
  background: color-mix(in srgb, var(--color-red) 10%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="skipped"] {
  opacity: 0.62;
  border-color: var(--text-faint);
  color: var(--text-faint);
}

.onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
  bottom: 9px !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

@container onprogram-calendar-card (max-width: 170px) {
  .onprogram-calendar-publishing-pill {
    min-width: 29px;
    height: 16px;
    min-height: 16px;
    padding: 0 4px;
    font-size: 9px;
    line-height: 14px;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}
`;
