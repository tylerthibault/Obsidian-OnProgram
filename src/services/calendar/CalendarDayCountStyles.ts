export const DAY_COUNT_STYLES = `
.onprogram-calendar-week-day-header {
  position: sticky;
}

.onprogram-calendar-day-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 24px;
  height: 24px;
  padding: 0 7px;
  border: 1px solid var(--interactive-accent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--interactive-accent) 15%, var(--background-primary));
  color: var(--text-normal);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-semibold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

.onprogram-calendar-week-day-header > .onprogram-calendar-day-count {
  position: absolute;
  top: 7px;
  right: 8px;
}

.onprogram-calendar-day-header > .onprogram-calendar-day-count {
  margin-left: auto;
  margin-right: 4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
}

@media (max-width: 900px) {
  .onprogram-calendar-week-day-header > .onprogram-calendar-day-count {
    top: 5px;
    right: 5px;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    font-size: var(--font-ui-smallest);
  }
}
`;
