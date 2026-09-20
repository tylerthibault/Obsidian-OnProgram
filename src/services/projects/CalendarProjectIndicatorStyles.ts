export const PROJECT_INDICATOR_STYLES = `
.onprogram-calendar-project-badge {
  z-index: 12;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  height: 18px;
  min-height: 18px;
  max-width: 44%;
  padding: 0 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  background: transparent !important;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: var(--font-semibold);
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
  position: absolute;
  right: 7px;
  bottom: 3px;
}

/* Publishing and project identity share one bottom row. */
.onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
  right: 47% !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-project .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

/* Month/all-day/unscheduled chips can keep the project label in normal flow. */
.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-project-badge {
  position: static;
  margin-left: 4px;
  vertical-align: middle;
  max-width: min(220px, 48%);
}

@container onprogram-calendar-card (max-width: 210px) {
  .onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
    right: 4px;
    max-width: 42%;
    height: 16px;
    min-height: 16px;
    padding: 0 4px;
    font-size: 9px;
    line-height: 14px;
  }

  .onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
    right: 45% !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-project .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}

@container onprogram-calendar-card (max-width: 145px) {
  .onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
    max-width: 46%;
    padding-left: 3px;
    padding-right: 3px;
    font-size: 8px;
  }

  .onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
    right: 49% !important;
  }
}
`;
