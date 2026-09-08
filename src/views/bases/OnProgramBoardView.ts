import { BasesView, Notice, type QueryController } from "obsidian";
import { WORK_ITEM_STATUSES, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";
import type { ErrorHandler } from "../../core/ErrorHandler";

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

    const board = this.hostEl.createDiv({ cls: "onprogram-board" });

    for (const status of WORK_ITEM_STATUSES) {
      const items = result.items.filter((item) => item.status === status);
      const column = board.createDiv({ cls: "onprogram-board-column" });
      column.dataset.status = status;

      const columnHeader = column.createDiv({ cls: "onprogram-board-column-header" });
      columnHeader.createEl("strong", { text: humanize(status) });
      columnHeader.createSpan({ text: String(items.length), cls: "onprogram-board-column-count" });

      const cards = column.createDiv({ cls: "onprogram-board-cards" });
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

        const title = card.createEl("button", {
          text: item.title,
          cls: "onprogram-board-card-title"
        });
        title.addEventListener("click", () => {
          const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
          if (entry) void this.app.workspace.getLeaf(false).openFile(entry.file);
        });

        const meta = card.createDiv({ cls: "onprogram-board-card-meta" });
        meta.createSpan({ text: item.priority });
        if (item.project) meta.createSpan({ text: item.project });
        if (item.dates.due) meta.createSpan({ text: `Due ${item.dates.due.iso}` });
        if (item.dates.scheduled) meta.createSpan({ text: `Scheduled ${item.dates.scheduled.iso}` });
      }
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
