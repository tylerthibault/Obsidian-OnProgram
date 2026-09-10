import { BasesView, Menu, Notice, type QueryController } from "obsidian";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import { OnProgramBasePickerModal } from "../../components/OnProgramBasePickerModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import { WORK_ITEM_STATUSES, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import {
  parseLinkedBaseBoardCards,
  serializeLinkedBaseBoardCards,
  type LinkedBaseBoardCard
} from "../../services/bases/LinkedBaseBoardCard";
import { resolveLinkedOnProgramBase } from "../../services/bases/LinkedOnProgramBase";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";

export const ONPROGRAM_BOARD_VIEW_ID = "onprogram-board";

type DraggedBoardItem =
  | { kind: "work-item"; path: string }
  | { kind: "linked-base"; basePath: string };

export class OnProgramBoardView extends BasesView {
  type = ONPROGRAM_BOARD_VIEW_ID;
  private draggedItem?: DraggedBoardItem;
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
    const linkedBases = this.getLinkedBaseCards();
    const totalCards = result.items.length + linkedBases.length;

    const header = this.hostEl.createDiv({ cls: "onprogram-board-header" });
    header.createEl("h3", { text: "OnProgram Board" });
    header.createSpan({
      text: `${totalCards} ${totalCards === 1 ? "card" : "cards"}`,
      cls: "onprogram-board-count"
    });

    if (result.invalid.length > 0) {
      header.createSpan({
        text: `${result.invalid.length} invalid`,
        cls: "onprogram-board-invalid-count"
      });
    }

    const addTask = header.createEl("button", { text: "+ Add" });
    addTask.setAttr("title", "Add a task or link another OnProgram Base");
    addTask.addEventListener("click", () => this.createTask());

    const board = this.hostEl.createDiv({ cls: "onprogram-board" });

    for (const status of WORK_ITEM_STATUSES) {
      const items = result.items.filter((item) => item.status === status);
      const baseCards = linkedBases.filter((card) => card.status === status);
      const column = board.createDiv({ cls: "onprogram-board-column" });
      column.dataset.status = status;

      const columnHeader = column.createDiv({ cls: "onprogram-board-column-header" });
      columnHeader.createEl("strong", { text: humanize(status) });
      columnHeader.createSpan({
        text: String(items.length + baseCards.length),
        cls: "onprogram-board-column-count"
      });

      const cards = column.createDiv({ cls: "onprogram-board-cards" });
      cards.setAttr("title", `Double-click empty space to create a ${humanize(status)} task`);
      cards.addEventListener("dblclick", (event) => {
        const target = event.target as HTMLElement;
        if (target.closest(".onprogram-board-card, button")) return;
        this.createTask(status);
      });
      cards.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (this.draggedItem) column.addClass("onprogram-board-drop-target");
      });
      cards.addEventListener("dragleave", () => column.removeClass("onprogram-board-drop-target"));
      cards.addEventListener("drop", (event) => {
        event.preventDefault();
        column.removeClass("onprogram-board-drop-target");
        void this.moveDraggedItem(status);
      });

      for (const item of items) {
        this.renderWorkItemCard(cards, item);
      }

      for (const linkedBase of baseCards) {
        this.renderLinkedBaseCard(cards, linkedBase);
      }
    }
  }

  private renderWorkItemCard(cards: HTMLElement, item: WorkItem): void {
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
      this.draggedItem = { kind: "work-item", path: item.source.path };
      card.addClass("onprogram-board-card-dragging");
      event.dataTransfer?.setData("text/plain", item.source.path);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => this.finishDrag(card));

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

  private renderLinkedBaseCard(cards: HTMLElement, linkedBase: LinkedBaseBoardCard): void {
    const baseFile = resolveLinkedOnProgramBase(this.app, linkedBase.basePath);
    const title = baseFile ? linkedBaseTitle(baseFile.name) : linkedBaseTitle(linkedBase.basePath);
    const card = cards.createDiv({
      cls: "onprogram-board-card onprogram-board-linked-base-card"
    });
    card.draggable = true;
    card.dataset.linkedBasePath = linkedBase.basePath;
    card.setAttr("role", "button");
    card.setAttr("tabindex", "0");
    card.setAttr(
      "title",
      baseFile
        ? `Open OnProgram Base: ${linkedBase.basePath}`
        : `Linked OnProgram Base not found: ${linkedBase.basePath}`
    );

    card.addEventListener("click", () => void this.openLinkedBase(linkedBase.basePath));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      void this.openLinkedBase(linkedBase.basePath);
    });
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showLinkedBaseCardMenu(event, linkedBase);
    });
    card.addEventListener("dragstart", (event) => {
      this.draggedItem = { kind: "linked-base", basePath: linkedBase.basePath };
      card.addClass("onprogram-board-card-dragging");
      event.dataTransfer?.setData("text/plain", linkedBase.basePath);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => this.finishDrag(card));

    card.createDiv({ text: title, cls: "onprogram-board-card-title" });
    const meta = card.createDiv({ cls: "onprogram-board-card-meta" });
    meta.createSpan({ text: linkedBase.priority });
    meta.createSpan({ text: "Base ↗", cls: "onprogram-board-linked-base-indicator" });
  }

  private finishDrag(card: HTMLElement): void {
    this.draggedItem = undefined;
    card.removeClass("onprogram-board-card-dragging");
    this.hostEl.querySelectorAll(".onprogram-board-drop-target")
      .forEach((element) => element.removeClass("onprogram-board-drop-target"));
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
      onLinkBase: async (baseFile) => {
        this.addLinkedBaseCard(baseFile.path, initialStatus ?? "todo");
        new Notice(`OnProgram: Added linked Base ${linkedBaseTitle(baseFile.name)}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "add board item", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private getLinkedBaseCards(): LinkedBaseBoardCard[] {
    return parseLinkedBaseBoardCards(this.config.get("linkedBases"));
  }

  private persistLinkedBaseCards(cards: LinkedBaseBoardCard[]): void {
    this.config.set("linkedBases", serializeLinkedBaseBoardCards(cards));
    this.render();
  }

  private addLinkedBaseCard(basePath: string, status: WorkItemStatus): void {
    const cards = this.getLinkedBaseCards();
    if (cards.some((card) => card.basePath === basePath)) {
      new Notice("OnProgram: That Base is already linked on this Board.");
      return;
    }

    this.persistLinkedBaseCards([
      ...cards,
      { basePath, status, priority: "normal" }
    ]);
  }

  private removeLinkedBaseCard(basePath: string): void {
    this.persistLinkedBaseCards(
      this.getLinkedBaseCards().filter((card) => card.basePath !== basePath)
    );
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

  private showLinkedBaseCardMenu(event: MouseEvent, linkedBase: LinkedBaseBoardCard): void {
    const menu = new Menu();
    menu.addItem((item) => item
      .setTitle("Open linked OnProgram Base")
      .setIcon("layout-dashboard")
      .onClick(() => void this.openLinkedBase(linkedBase.basePath)));
    menu.addItem((item) => item
      .setTitle("Remove from Board")
      .setIcon("unlink")
      .onClick(() => this.removeLinkedBaseCard(linkedBase.basePath)));
    menu.showAtMouseEvent(event);
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
    if (this.writing || !this.draggedItem) return;

    if (this.draggedItem.kind === "linked-base") {
      const basePath = this.draggedItem.basePath;
      const cards = this.getLinkedBaseCards();
      const card = cards.find((candidate) => candidate.basePath === basePath);
      if (!card || card.status === status) return;

      this.persistLinkedBaseCards(cards.map((candidate) =>
        candidate.basePath === basePath ? { ...candidate, status } : candidate
      ));
      new Notice(`OnProgram: moved ${linkedBaseTitle(basePath)} to ${humanize(status)}.`);
      this.draggedItem = undefined;
      return;
    }

    const path = this.draggedItem.path;
    const result = this.adapter.adapt(this.data);
    const item = result.items.find((candidate) => candidate.source.path === path);
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
      this.draggedItem = undefined;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }
}

function linkedBaseTitle(pathOrName: string): string {
  const name = pathOrName.split("/").pop() ?? pathOrName;
  return name.replace(/\.onprogram\.base$/i, "").replace(/\.base$/i, "");
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
