import { BasesView, Menu, Notice, type QueryController } from "obsidian";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import { OnProgramBasePickerModal } from "../../components/OnProgramBasePickerModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import { WORK_ITEM_STATUSES, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import { resolveLinkedOnProgramBase } from "../../services/bases/LinkedOnProgramBase";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";

export const ONPROGRAM_BOARD_VIEW_ID = "onprogram-board";

export class OnProgramBoardView extends BasesView {
  type = ONPROGRAM_BOARD_VIEW_ID;
  private draggedPath?: string;
  private writing = false;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly writer: WorkItemWriter,
    private readonly taskCreator: TaskCreator,
    private readonly workItemOpener: WorkItemOpener,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-board-view");

    const result = this.adapter.adapt(this.data);
    const header = this.hostEl.createDiv({ cls: "onprogram-board-header" });
    header.createEl("h3", { text: "OnProgram Board" });
    header.createSpan({
      text: `${result.items.length} ${result.items.length === 1 ? "card" : "cards"}`,
      cls: "onprogram-board-count"
    });

    if (result.invalid.length > 0) {
      header.createSpan({
        text: `${result.invalid.length} invalid`,
        cls: "onprogram-board-invalid-count"
      });
    }

    const addTask = header.createEl("button", { text: "+ New task" });
    addTask.addEventListener("click", () => this.createTask());

    const board = this.hostEl.createDiv({ cls: "onprogram-board" });

    for (const status of WORK_ITEM_STATUSES) {
      const items = result.items.filter((item) => item.status === status);
      const column = board.createDiv({ cls: "onprogram-board-column" });
      column.dataset.status = status;

      const columnHeader = column.createDiv({ cls: "onprogram-board-column-header" });
      columnHeader.createEl("strong", { text: humanize(status) });
      columnHeader.createSpan({ text: String(items.length), cls: "onprogram-board-column-count" });

      const cards = column.createDiv({ cls: "onprogram-board-cards" });
      cards.setAttr("title", `Double-click empty space to create a ${humanize(status)} task`);
      cards.addEventListener("dblclick", (event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".onprogram-board-card, button")) return;
        this.createTask(status);
      });
      cards.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (this.draggedPath) column.addClass("onprogram-board-drop-target");
      });
      cards.addEventListener("dragleave", () => column.removeClass("onprogram-board-drop-target"));
      cards.addEventListener("drop", (event) => {
        event.preventDefault();
        column.removeClass("onprogram-board-drop-target");
        void this.moveDraggedItem(status);
      });

      for (const item of items) {
        const card = cards.createDiv({ cls: "onprogram-board-card" });
        card.draggable = true;
        card.dataset.path = item.source.path;
        card.setAttr("title", item.linkedBase
          ? "Click the title to open the linked Base. Double-click the card to open the task note."
          : "Double-click to open this task. Right-click to link an OnProgram Base.");

        card.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          this.openItem(item.source.path);
        });
        card.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.showCardMenu(event, item);
        });
        card.addEventListener("dragstart", (event) => {
          this.draggedPath = item.source.path;
          card.addClass("onprogram-board-card-dragging");
          event.dataTransfer?.setData("text/plain", item.source.path);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        });
        card.addEventListener("dragend", () => {
          this.draggedPath = undefined;
          card.removeClass("onprogram-board-card-dragging");
          this.hostEl.querySelectorAll(".onprogram-board-drop-target")
            .forEach((element) => element.removeClass("onprogram-board-drop-target"));
        });

        const titleButton = card.createEl("button", {
          text: item.title,
          cls: "onprogram-board-card-title"
        });

        if (item.linkedBase) {
          card.addClass("onprogram-board-card-has-linked-base");
          titleButton.addClass("onprogram-board-card-linked-title");
          titleButton.setAttr("title", `Open linked OnProgram Base: ${item.linkedBase}`);
          titleButton.addEventListener("click", (event) => {
            event.stopPropagation();
            void this.openLinkedBase(item.linkedBase);
          });
          titleButton.addEventListener("dblclick", (event) => event.stopPropagation());
        }

        const meta = card.createDiv({ cls: "onprogram-board-card-meta" });
        meta.createSpan({ text: item.priority });
        if (item.project) meta.createSpan({ text: item.project });
        if (item.linkedBase) {
          meta.createSpan({ text: "Base ↗", cls: "onprogram-board-linked-base-indicator" });
        }
        if (item.dates.due) meta.createSpan({ text: `Due ${item.dates.due.iso}` });
        if (item.dates.scheduled) meta.createSpan({ text: `Scheduled ${item.dates.scheduled.iso}` });
      }
    }
  }

  private createTask(initialStatus?: WorkItemStatus): void {
    new CreateTaskModal(this.app, {
      onSubmit: async (title) => {
        const result = await this.taskCreator.createTask({
          title,
          initialStatus,
          targetFolder: this.getConfiguredTaskFolder(),
          openAfterCreate: false
        });
        new Notice(`OnProgram: Created ${result.title}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "create board task", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private openItem(path: string): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === path);
    if (entry) void this.workItemOpener.open(entry.file);
  }

  private async openLinkedBase(reference: string | undefined): Promise<void> {
    const baseFile = resolveLinkedOnProgramBase(this.app, reference);
    if (!baseFile) {
      new Notice(`OnProgram: Linked Base was not found${reference ? `: ${reference}` : "."}`);
      return;
    }

    await this.app.workspace.getLeaf(false).openFile(baseFile);
  }

  private showCardMenu(event: MouseEvent, item: WorkItem): void {
    const menu = new Menu();

    if (item.linkedBase) {
      menu.addItem((menuItem) => menuItem
        .setTitle("Open linked OnProgram Base")
        .setIcon("layout-dashboard")
        .onClick(() => void this.openLinkedBase(item.linkedBase)));

      menu.addItem((menuItem) => menuItem
        .setTitle("Change linked OnProgram Base…")
        .setIcon("link")
        .onClick(() => this.chooseLinkedBase(item)));

      menu.addItem((menuItem) => menuItem
        .setTitle("Remove linked OnProgram Base")
        .setIcon("unlink")
        .onClick(() => void this.setLinkedBase(item, null)));
    } else {
      menu.addItem((menuItem) => menuItem
        .setTitle("Link to OnProgram Base…")
        .setIcon("link")
        .onClick(() => this.chooseLinkedBase(item)));
    }

    menu.addSeparator();
    menu.addItem((menuItem) => menuItem
      .setTitle("Open task note")
      .setIcon("file-text")
      .onClick(() => this.openItem(item.source.path)));

    menu.showAtMouseEvent(event);
  }

  private chooseLinkedBase(item: WorkItem): void {
    new OnProgramBasePickerModal(this.app, (baseFile) => {
      void this.setLinkedBase(item, baseFile.path);
    }).open();
  }

  private async setLinkedBase(item: WorkItem, linkedBase: string | null): Promise<void> {
    if (this.writing) return;
    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");

    try {
      await this.writer.updateItem(item, { linkedBase });
      new Notice(linkedBase
        ? `OnProgram: linked ${item.title} to ${linkedBase}.`
        : `OnProgram: removed linked Base from ${item.title}.`);
    } catch (error) {
      this.errorHandler.handle(error, "link board card to OnProgram Base", true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }

  private async moveDraggedItem(status: WorkItemStatus): Promise<void> {
    if (this.writing || !this.draggedPath) return;

    const result = this.adapter.adapt(this.data);
    const item = result.items.find((candidate) => candidate.source.path === this.draggedPath);
    if (!item || item.status === status) return;

    const schema = getWorkItemTypeSchema(item.type);
    if (!schema.allowedStatuses.includes(status)) {
      new Notice(`OnProgram: ${humanize(status)} is not valid for ${item.type} items.`);
      return;
    }

    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, { status });
      new Notice(`OnProgram: moved ${item.title} to ${humanize(status)}.`);
    } catch (error) {
      this.errorHandler.handle(error, "move board card", true);
    } finally {
      this.writing = false;
      this.draggedPath = undefined;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
