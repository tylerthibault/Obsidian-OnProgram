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

  constructor(
    private readonly plugin: Plugin,
    private readonly parser: WorkItemParser,
    private readonly writer: WorkItemWriter,
    private readonly errorHandler: ErrorHandler
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    this.container.addEventListener("contextmenu", this.handleContextMenu);

    const view = this.container.ownerDocument.defaultView;
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

    const view = this.container?.ownerDocument.defaultView;
    if (view && this.refreshFrame !== undefined) {
      view.cancelAnimationFrame(this.refreshFrame);
    }
    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const calendarItem = target?.closest<HTMLElement>(".onprogram-calendar-item[data-path]");
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

    for (const element of container.querySelectorAll<HTMLElement>(
      ".onprogram-calendar-item[data-path]"
    )) {
      const path = element.dataset.path;
      if (!path) continue;

      const item = this.getWorkItem(path);
      if (!item) continue;

      element.dataset[STATUS_DATASET_KEY] = item.status;
      element.setAttr(
        "title",
        `${item.title}\nStatus: ${humanize(item.status)}\nRight-click to change status. Double-click to open.`
      );

      let badge = element.querySelector<HTMLElement>(`.${STATUS_BADGE_CLASS}`);
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
