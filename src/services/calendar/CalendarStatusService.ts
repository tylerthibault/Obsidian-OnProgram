import { Menu, Notice, TFile, type Plugin } from "obsidian";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { OnProgramService } from "../ServiceRegistry";
import type { WorkItemParser } from "../work-items/WorkItemParser";
import type { WorkItemWriter } from "../work-items/WorkItemWriter";
import type { ErrorHandler } from "../../core/ErrorHandler";

const STATUS_BADGE_CLASS = "onprogram-calendar-status-badge";
const STATUS_DATASET_KEY = "onprogramStatus";

export class CalendarStatusService implements OnProgramService {
  readonly id = "calendar-status";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(
    private readonly plugin: Plugin,
    private readonly parser: WorkItemParser,
    private readonly writer: WorkItemWriter,
    private readonly errorHandler: ErrorHandler
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    this.container.addEventListener("contextmenu", this.handleContextMenu);

    const doc = this.container.ownerDocument;
    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramCalendarStatusStyles = "true";
    this.styleEl.textContent = CALENDAR_STATUS_STYLES;
    doc.head.appendChild(this.styleEl);

    const view = doc.defaultView;
    if (view) {
      this.observer = new view.MutationObserver(() => this.queueRefresh());
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    this.queueRefresh();
  }

  stop(): void {
    if (this.container) {
      this.container.removeEventListener("contextmenu", this.handleContextMenu);
    }
    this.observer?.disconnect();
    this.observer = undefined;
    this.styleEl?.remove();
    this.styleEl = undefined;

    const view = this.container?.ownerDocument.defaultView;
    if (view && this.refreshFrame !== undefined) {
      view.cancelAnimationFrame(this.refreshFrame);
    }
    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const calendarItem = target?.closest(".onprogram-calendar-item[data-path]") as HTMLElement | null;
    if (!calendarItem) return;

    const path = calendarItem.dataset.path;
    if (!path) return;

    const workItem = this.getWorkItem(path);
    if (!workItem) return;

    event.preventDefault();
    event.stopPropagation();

    const menu = new Menu();
    const schema = getWorkItemTypeSchema(workItem.type);

    if (workItem.status !== "done" && schema.allowedStatuses.includes("done")) {
      menu.addItem((item) => {
        item
          .setTitle("Mark done")
          .setIcon("check")
          .onClick(() => void this.setStatus(workItem, "done"));
      });
    }

    if (workItem.status !== "posted" && schema.allowedStatuses.includes("posted")) {
      menu.addItem((item) => {
        item
          .setTitle("Mark posted")
          .setIcon("send")
          .onClick(() => void this.setStatus(workItem, "posted"));
      });
    }

    if (workItem.status === "done" || workItem.status === "posted") {
      menu.addSeparator();
      menu.addItem((item) => {
        item
          .setTitle(`Reopen as ${humanize(schema.defaultStatus)}`)
          .setIcon("rotate-ccw")
          .onClick(() => void this.setStatus(workItem, schema.defaultStatus));
      });
    }

    menu.showAtMouseEvent(event);
  };

  private async setStatus(item: WorkItem, status: WorkItemStatus): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(item.source.path);
    if (!(file instanceof TFile)) return;

    try {
      await this.writer.updateFile(file, { status });
      new Notice(`OnProgram: ${item.title} marked ${humanize(status)}.`);
      this.queueRefresh();
    } catch (error) {
      this.errorHandler.handle(error, "change calendar item status", true);
    }
  }

  private getWorkItem(path: string): WorkItem | undefined {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return undefined;

    const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    const result = this.parser.parse(file, frontmatter);
    return result.kind === "valid" ? result.item : undefined;
  }

  private queueRefresh(): void {
    const container = this.container;
    const view = container?.ownerDocument.defaultView;
    if (!container || !view || this.refreshFrame !== undefined) return;

    this.refreshFrame = view.requestAnimationFrame(() => {
      this.refreshFrame = undefined;
      this.refreshAnnotations();
    });
  }

  private refreshAnnotations(): void {
    const container = this.container;
    if (!container) return;

    const elements = Array.from(
      container.querySelectorAll(".onprogram-calendar-item[data-path]")
    ) as HTMLElement[];

    for (const element of elements) {
      const path = element.dataset.path;
      if (!path) continue;

      const item = this.getWorkItem(path);
      if (!item) continue;

      element.dataset[STATUS_DATASET_KEY] = item.status;
      element.setAttr(
        "title",
        `${item.title}\nStatus: ${humanize(item.status)}\nRight-click to change status. Double-click to open.`
      );

      let badge = element.querySelector(`.${STATUS_BADGE_CLASS}`) as HTMLElement | null;
      if (item.status === "done" || item.status === "posted") {
        if (!badge) {
          badge = element.createSpan({ cls: STATUS_BADGE_CLASS });
        }
        badge.setText(humanize(item.status));
      } else {
        badge?.remove();
      }
    }
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const CALENDAR_STATUS_STYLES = `
.onprogram-calendar-view .onprogram-calendar-timed-item {
  position: absolute;
}

.onprogram-calendar-view .onprogram-calendar-timed-item .onprogram-calendar-timed-title {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 20px;
  bottom: 10px;
  width: auto;
  max-width: none;
  min-width: 0;
  height: auto;
  padding: 0 4px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: normal;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-overflow: clip;
  text-align: center;
  line-height: 1.15;
}

.onprogram-calendar-status-badge {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 1px 5px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--background-primary-alt);
  font-size: var(--font-ui-smallest);
  font-weight: var(--font-semibold);
  line-height: 1.35;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  pointer-events: none;
}

.onprogram-calendar-timed-item .onprogram-calendar-status-badge {
  position: absolute;
  top: 5px;
  right: 6px;
  z-index: 7;
  margin: 0;
}

.onprogram-calendar-item[data-onprogram-status="done"] {
  opacity: 0.58;
  filter: saturate(0.55);
}

.onprogram-calendar-item[data-onprogram-status="done"] .onprogram-calendar-item-title {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}

.onprogram-calendar-item[data-onprogram-status="posted"] {
  box-shadow: inset 4px 0 0 var(--interactive-accent), var(--shadow-s);
  background: var(--background-modifier-hover);
}

.onprogram-calendar-item[data-onprogram-status="posted"] .onprogram-calendar-status-badge {
  color: var(--text-accent);
  border-color: var(--interactive-accent);
}
`;
