import type { Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";

type CalendarScrollKind = "month" | "week" | "day";

const SCROLL_SELECTOR = [
  ".onprogram-calendar-month",
  ".onprogram-calendar-week",
  ".onprogram-calendar-day-hours"
].join(", ");

export class CalendarScrollStateService implements OnProgramService {
  readonly id = "calendar-scroll-state";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private restoreFrame?: number;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    this.container.addEventListener("scroll", this.handleScroll, true);

    const win = this.container.ownerDocument.defaultView;
    if (!win) return;

    this.observer = new win.MutationObserver(() => this.queueRestore());
    this.observer.observe(this.container, { childList: true, subtree: true });
  }

  stop(): void {
    if (this.container) {
      this.container.removeEventListener("scroll", this.handleScroll, true);
    }

    this.observer?.disconnect();
    this.observer = undefined;

    const win = this.container?.ownerDocument.defaultView;
    if (win && this.restoreFrame !== undefined) {
      win.cancelAnimationFrame(this.restoreFrame);
    }

    this.restoreFrame = undefined;
    this.container = undefined;
  }

  private readonly handleScroll = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target?.matches?.(SCROLL_SELECTOR)) return;

    const root = target.closest(".onprogram-calendar-view") as HTMLElement | null;
    if (!root) return;

    const kind = getScrollKind(target);
    if (!kind) return;

    root.dataset.onprogramScrollKind = kind;
    root.dataset.onprogramScrollTop = String(target.scrollTop);
    root.dataset.onprogramScrollLeft = String(target.scrollLeft);
  };

  private queueRestore(): void {
    const container = this.container;
    const win = container?.ownerDocument.defaultView;
    if (!container || !win || this.restoreFrame !== undefined) return;

    this.restoreFrame = win.requestAnimationFrame(() => {
      this.restoreFrame = undefined;
      this.restoreScrollPositions();
    });
  }

  private restoreScrollPositions(): void {
    const container = this.container;
    if (!container) return;

    const roots = Array.from(
      container.querySelectorAll(".onprogram-calendar-view[data-onprogram-scroll-kind]")
    ) as HTMLElement[];

    for (const root of roots) {
      const kind = root.dataset.onprogramScrollKind as CalendarScrollKind | undefined;
      if (!kind) continue;

      const scroller = root.querySelector(getSelectorForKind(kind)) as HTMLElement | null;
      if (!scroller) continue;

      const top = Number(root.dataset.onprogramScrollTop ?? "0");
      const left = Number(root.dataset.onprogramScrollLeft ?? "0");

      if (Number.isFinite(top)) scroller.scrollTop = top;
      if (Number.isFinite(left)) scroller.scrollLeft = left;
    }
  }
}

function getScrollKind(element: HTMLElement): CalendarScrollKind | undefined {
  if (element.classList.contains("onprogram-calendar-month")) return "month";
  if (element.classList.contains("onprogram-calendar-week")) return "week";
  if (element.classList.contains("onprogram-calendar-day-hours")) return "day";
  return undefined;
}

function getSelectorForKind(kind: CalendarScrollKind): string {
  if (kind === "month") return ".onprogram-calendar-month";
  if (kind === "week") return ".onprogram-calendar-week";
  return ".onprogram-calendar-day-hours";
}
