export const BADGE_STYLES = `
.onprogram-calendar-item,
.onprogram-board-card {
  position: relative;
}

/* Timed cards are their own responsive containers, so badge layout can react
   to the actual card width instead of the overall Obsidian pane width. */
.onprogram-calendar-view .onprogram-calendar-timed-item {
  container-type: inline-size;
  container-name: onprogram-calendar-card;
}

.onprogram-work-item-badge {
  --onprogram-badge-color: var(--interactive-accent);
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 30px;
  height: 22px;
  min-height: 22px;
  max-height: 22px;
  max-width: 42%;
  box-sizing: border-box;
  padding: 1px 8px;
  border: 1px solid var(--onprogram-badge-color);
  border-radius: 999px;
  background: color-mix(in srgb, var(--onprogram-badge-color) 18%, var(--background-primary));
  color: var(--text-normal);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-semibold);
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.onprogram-work-item-badge[data-badge-color="green"] { --onprogram-badge-color: var(--color-green); }
.onprogram-work-item-badge[data-badge-color="blue"] { --onprogram-badge-color: var(--color-blue); }
.onprogram-work-item-badge[data-badge-color="purple"] { --onprogram-badge-color: var(--color-purple); }
.onprogram-work-item-badge[data-badge-color="orange"] { --onprogram-badge-color: var(--color-orange); }
.onprogram-work-item-badge[data-badge-color="red"] { --onprogram-badge-color: var(--color-red); }
.onprogram-work-item-badge[data-badge-color="yellow"] { --onprogram-badge-color: var(--color-yellow); }
.onprogram-work-item-badge[data-badge-color="gray"] { --onprogram-badge-color: var(--text-muted); }

.onprogram-views-badge {
  min-width: 34px;
  pointer-events: auto;
  cursor: help;
}

/* Calendar status + property + views badges share one horizontal floating row. */
.onprogram-calendar-badge-tray {
  position: absolute;
  top: -8px;
  right: -7px;
  z-index: 14;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  max-width: calc(100% - 8px);
  pointer-events: none;
}

.onprogram-calendar-badge-tray > .onprogram-work-item-badge,
.onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
  position: static !important;
  inset: auto !important;
  flex: 0 0 auto;
  margin: 0;
}

.onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
  order: 1;
}

.onprogram-calendar-badge-tray > .onprogram-primary-badge {
  order: 2;
}

.onprogram-calendar-badge-tray > .onprogram-views-badge {
  order: 3;
  pointer-events: auto;
}

/* Board cards do not have a shared tray yet, so offset a second badge inward. */
.onprogram-board-card > .onprogram-primary-badge {
  right: 6px;
}

.onprogram-board-card > .onprogram-views-badge {
  right: 54px;
}

/* Keep timed titles on one clean line; native Page Preview handles overflow detail. */
.onprogram-calendar-view .onprogram-calendar-timed-item .onprogram-calendar-timed-title {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 22px;
  bottom: 9px;
  width: auto;
  max-width: none;
  min-width: 0;
  height: auto;
  margin: 0;
  padding: 0 6px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.3;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item).onprogram-has-work-item-badge .onprogram-calendar-item-title {
  padding-right: 44px;
}

.onprogram-board-card.onprogram-has-work-item-badge .onprogram-board-card-title {
  padding-right: 104px;
}

/* Compact timed cards: keep badges inside the card. The posted/done state is
   already communicated by the card treatment, so the full status pill is
   hidden when horizontal room is scarce. */
@container onprogram-calendar-card (max-width: 210px) {
  .onprogram-calendar-badge-tray {
    top: 4px;
    right: 4px;
    max-width: calc(100% - 8px);
    gap: 3px;
  }

  .onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
    display: none !important;
  }

  .onprogram-calendar-badge-tray > .onprogram-work-item-badge {
    min-width: 24px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
    max-width: 58px;
    padding: 0 5px;
    font-size: 10px;
    line-height: 16px;
  }

  .onprogram-calendar-badge-tray > .onprogram-views-badge {
    min-width: 28px;
  }

  .onprogram-calendar-item-time {
    max-width: calc(100% - 72px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .onprogram-calendar-timed-title {
    top: 24px !important;
    left: 5px !important;
    right: 5px !important;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }
}

@container onprogram-calendar-card (max-width: 145px) {
  .onprogram-calendar-badge-tray {
    gap: 2px;
    right: 3px;
  }

  .onprogram-calendar-badge-tray > .onprogram-work-item-badge {
    min-width: 22px;
    max-width: 48px;
    padding-left: 4px;
    padding-right: 4px;
    font-size: 9px;
  }

  .onprogram-calendar-item-time {
    font-size: 10px;
    max-width: calc(100% - 58px);
  }
}
`;
