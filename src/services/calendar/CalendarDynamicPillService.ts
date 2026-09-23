import { TFile, setIcon, type Plugin } from "obsidian";
import {
  parseWorkItemPills,
  resolveWorkItemPillColor,
  type WorkItemPill
} from "../../models/work-item/WorkItemPill";
import type { OnProgramService } from "../ServiceRegistry";

const TRAY_CLASS = "onprogram-calendar-dynamic-pill-tray";
const PILL_CLASS = "onprogram-calendar-dynamic-pill";
const CARD_SELECTOR = ".onprogram-calendar-item[data-path]";

export class CalendarDynamicPillService implements OnProgramService {
  readonly id = "calendar-dynamic-pills";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(
    private readonly plugin: Plugin,
    private readonly getPillProperty: () => string
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const doc = this.container.ownerDocument;
    const win = doc.defaultView;

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramDynamicPillStyles = "true";
    this.styleEl.textContent = DYNAMIC_PILL_STYLES;
    doc.head.appendChild(this.styleEl);

    if (win) {
      this.observer = new win.MutationObserver((mutations) => {
        if (mutations.some((mutation) => shouldRefreshForMutation(mutation))) {
          this.queueRefresh();
        }
      });
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on("changed", () => this.queueRefresh())
    );

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
      this.refresh();
    });
  }

  private refresh(): void {
    const container = this.container;
    if (!container) return;

    for (const rawCard of Array.from(container.querySelectorAll(CARD_SELECTOR))) {
      this.refreshCard(rawCard as HTMLElement);
    }
  }

  private refreshCard(card: HTMLElement): void {
    const path = card.dataset.path;
    if (!path) return;

    const pills = this.getPills(path);
    let tray = card.querySelector(`:scope > .${TRAY_CLASS}`) as HTMLElement | null;

    if (pills.length === 0) {
      tray?.remove();
      card.removeClass("onprogram-has-dynamic-pills");
      return;
    }

    if (!tray) tray = card.createDiv({ cls: TRAY_CLASS });
    tray.empty();

    for (const pill of pills) {
      tray.appendChild(this.createPill(tray.ownerDocument, pill));
    }

    card.addClass("onprogram-has-dynamic-pills");
  }

  private createPill(doc: Document, pill: WorkItemPill): HTMLElement {
    const element = doc.createElement("span");
    element.addClass(PILL_CLASS);
    element.dataset.pillType = pill.type;
    element.dataset.pillColor = resolveWorkItemPillColor(pill);

    if (pill.icon) {
      const icon = element.createSpan({ cls: "onprogram-calendar-dynamic-pill-icon" });
      try {
        setIcon(icon, pill.icon);
      } catch {
        icon.remove();
      }
    }

    element.createSpan({
      text: pill.value,
      cls: "onprogram-calendar-dynamic-pill-value"
    });

    const tooltip = `${humanize(pill.type)}: ${pill.value}`;
    element.setAttr("title", tooltip);
    element.setAttr("aria-label", tooltip);
    return element;
  }

  private getPills(path: string): WorkItemPill[] {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return [];

    const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) return [];

    const property = this.getPillProperty().trim() || "onprogram_pills";
    return parseWorkItemPills(frontmatter[property]).pills;
  }
}

function shouldRefreshForMutation(mutation: MutationRecord): boolean {
  const target = mutation.target as HTMLElement;
  return !target.closest?.(`.${TRAY_CLASS}`);
}

function humanize(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const DYNAMIC_PILL_STYLES = `
.onprogram-calendar-dynamic-pill-tray {
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  z-index: 11;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item).onprogram-has-dynamic-pills {
  flex-wrap: wrap;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-dynamic-pill-tray {
  flex: 1 0 100%;
  width: 100%;
  flex-wrap: wrap;
  margin-top: 4px;
}

.onprogram-calendar-timed-item > .onprogram-calendar-dynamic-pill-tray {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 3px;
  min-height: 18px;
  overflow-x: auto;
  overflow-y: hidden;
  flex-wrap: nowrap;
  scrollbar-width: none;
  pointer-events: auto;
}

.onprogram-calendar-timed-item > .onprogram-calendar-dynamic-pill-tray::-webkit-scrollbar {
  display: none;
}

.onprogram-calendar-timed-item.onprogram-has-publishing > .onprogram-calendar-dynamic-pill-tray {
  bottom: 23px;
}

.onprogram-calendar-dynamic-pill {
  --onprogram-dynamic-pill-color: var(--interactive-accent);
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  box-sizing: border-box;
  min-width: 0;
  height: 18px;
  padding: 0 6px;
  border: 1px solid var(--onprogram-dynamic-pill-color);
  border-radius: 999px;
  background: color-mix(in srgb, var(--onprogram-dynamic-pill-color) 72%, var(--background-primary));
  color: var(--text-normal);
  font-size: 10px;
  font-weight: var(--font-semibold);
  line-height: 16px;
  white-space: nowrap;
}

.onprogram-calendar-dynamic-pill[data-pill-color="green"] { --onprogram-dynamic-pill-color: var(--color-green); }
.onprogram-calendar-dynamic-pill[data-pill-color="blue"] { --onprogram-dynamic-pill-color: var(--color-blue); }
.onprogram-calendar-dynamic-pill[data-pill-color="purple"] { --onprogram-dynamic-pill-color: var(--color-purple); }
.onprogram-calendar-dynamic-pill[data-pill-color="orange"] { --onprogram-dynamic-pill-color: var(--color-orange); }
.onprogram-calendar-dynamic-pill[data-pill-color="red"] { --onprogram-dynamic-pill-color: var(--color-red); }
.onprogram-calendar-dynamic-pill[data-pill-color="yellow"] { --onprogram-dynamic-pill-color: var(--color-yellow); }
.onprogram-calendar-dynamic-pill[data-pill-color="gray"] { --onprogram-dynamic-pill-color: var(--text-muted); }

.onprogram-calendar-dynamic-pill-icon,
.onprogram-calendar-dynamic-pill-icon svg {
  width: 11px;
  height: 11px;
  flex: 0 0 11px;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-dynamic-pills:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-dynamic-pills.onprogram-has-publishing .onprogram-calendar-timed-title {
  bottom: 45px !important;
}

@container onprogram-calendar-card (max-width: 170px) {
  .onprogram-calendar-dynamic-pill {
    height: 16px;
    min-height: 16px;
    padding: 0 4px;
    font-size: 9px;
    line-height: 14px;
  }

  .onprogram-calendar-timed-item.onprogram-has-publishing > .onprogram-calendar-dynamic-pill-tray {
    bottom: 21px;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-dynamic-pills:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-dynamic-pills.onprogram-has-publishing .onprogram-calendar-timed-title {
    bottom: 41px !important;
  }
}
`;
