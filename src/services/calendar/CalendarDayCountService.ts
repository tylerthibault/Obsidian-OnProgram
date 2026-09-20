import type { Plugin } from "obsidian";
import { DAY_COUNT_STYLES } from "./CalendarDayCountStyles";
import type { OnProgramService } from "../ServiceRegistry";

const COUNT_CLASS = "onprogram-calendar-day-count";

export class CalendarDayCountService implements OnProgramService {
  readonly id = "calendar-day-counts";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const doc = this.container.ownerDocument;
    const win = doc.defaultView;

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramCalendarDayCountStyles = "true";
    this.styleEl.textContent = DAY_COUNT_STYLES;
    doc.head.appendChild(this.styleEl);

    if (win) {
      this.observer = new win.MutationObserver(() => this.queueRefresh());
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    this.queueRefresh();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.styleEl?.remove();
    this.styleEl = undefined;

    const win = this.container?.ownerDocument.defaultView;
    if (win && this.refreshFrame !== undefined) {
      win.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private queueRefresh(): void {
    const container = this.container;
    const win = container?.ownerDocument.defaultView;
    if (!container || !win || this.refreshFrame !== undefined) return;

    this.refreshFrame = win.requestAnimationFrame(() => {
      this.refreshFrame = undefined;
      this.refreshCounts();
    });
  }

  private refreshCounts(): void {
    const container = this.container;
    if (!container) return;

    for (const rawWeek of Array.from(
      container.querySelectorAll(".onprogram-calendar-view .onprogram-calendar-week")
    )) {
      this.refreshWeek(rawWeek as HTMLElement);
    }

    for (const rawMonth of Array.from(
      container.querySelectorAll(".onprogram-calendar-view .onprogram-calendar-month")
    )) {
      this.refreshMonth(rawMonth as HTMLElement);
    }
  }

  private refreshWeek(calendar: HTMLElement): void {
    const headers = Array.from(
      calendar.querySelectorAll(":scope > .onprogram-calendar-week-day-header")
    ) as HTMLElement[];
    if (headers.length !== 7) return;

    const dayPaths: Array<Set<string>> = Array.from({ length: 7 }, () => new Set<string>());
    const cells = Array.from(
      calendar.querySelectorAll(":scope > .onprogram-calendar-week-cell")
    ) as HTMLElement[];

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const paths = dayPaths[index % 7];
      if (!cell || !paths) continue;

      const items = Array.from(
        cell.querySelectorAll(".onprogram-calendar-item[data-path]")
      ) as HTMLElement[];

      for (const item of items) {
        const path = item.dataset.path;
        if (path) paths.add(path);
      }
    }

    headers.forEach((header, index) => {
      const paths = dayPaths[index];
      updateCountBadge(header, paths ? paths.size : 0, "week");
    });
  }

  private refreshMonth(calendar: HTMLElement): void {
    const cells = Array.from(
      calendar.querySelectorAll(":scope > .onprogram-calendar-day-cell")
    ) as HTMLElement[];

    for (const cell of cells) {
      const header = cell.querySelector(
        ":scope > .onprogram-calendar-day-header"
      ) as HTMLElement | null;
      if (!header) continue;

      const paths = new Set<string>();
      const items = Array.from(
        cell.querySelectorAll(".onprogram-calendar-item[data-path]")
      ) as HTMLElement[];

      for (const item of items) {
        const path = item.dataset.path;
        if (path) paths.add(path);
      }

      updateCountBadge(header, paths.size, "month");
    }
  }
}

function updateCountBadge(
  header: HTMLElement,
  count: number,
  mode: "week" | "month"
): void {
  let badge = header.querySelector(`:scope > .${COUNT_CLASS}`) as HTMLElement | null;

  if (count <= 0) {
    badge?.remove();
    return;
  }

  if (!badge) {
    badge = header.createSpan({ cls: COUNT_CLASS });

    if (mode === "month") {
      const addButton = header.querySelector(":scope > .onprogram-calendar-add");
      if (addButton) header.insertBefore(badge, addButton);
    }
  }

  const text = String(count);
  if (badge.textContent !== text) badge.setText(text);

  const label = `${count} work ${count === 1 ? "item" : "items"} on this date`;
  badge.setAttr("title", label);
  badge.setAttr("aria-label", label);
}

