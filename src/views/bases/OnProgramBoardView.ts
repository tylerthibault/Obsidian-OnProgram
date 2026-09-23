import { BasesView, Menu, Modal, Notice, Setting, type App, type QueryController } from "obsidian";
import { BatchTaskImportModal } from "../../components/BatchTaskImportModal";
import { BoardStatusSelectorModal } from "../../components/BoardStatusSelectorModal";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import { openLinkedMarkdownCreateFlow } from "../../components/LinkedMarkdownCreateFlow";
import { OnProgramBasePickerModal } from "../../components/OnProgramBasePickerModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import { DEFAULT_WORK_ITEM_PILL_TYPES, type WorkItemPill } from "../../models/work-item/WorkItemPill";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import { WORK_ITEM_STATUSES, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { LinkedMarkdownInstanceStore } from "../../services/bases/LinkedMarkdownInstanceStore";
import {
  parseBoardStatusPreferences,
  serializeBoardStatusPreferences,
  type BoardStatusPreferences
} from "../../services/bases/BoardStatusPreferences";
import {
  parseLinkedBaseBoardCards,
  serializeLinkedBaseBoardCards,
  type LinkedBaseBoardCard
} from "../../services/bases/LinkedBaseBoardCard";
import { resolveLinkedOnProgramBase } from "../../services/bases/LinkedOnProgramBase";
import type { ProjectAssignmentService } from "../../services/projects/ProjectAssignmentService";
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
    private readonly projectAssignment: ProjectAssignmentService,
    private readonly workItemOpener: WorkItemOpener,
    private readonly linkedMarkdownStore: LinkedMarkdownInstanceStore,
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
    const statusPreferences = this.getStatusPreferences();
    const visibleStatuses = new Set(statusPreferences.visible);
    const visibleCardCount =
      result.items.filter((item) => visibleStatuses.has(item.status)).length
      + linkedBases.filter((card) => visibleStatuses.has(card.status)).length;
    const totalCards = result.items.length + linkedBases.length;
    const hiddenCardCount = totalCards - visibleCardCount;

    const header = this.hostEl.createDiv({ cls: "onprogram-board-header" });
    header.createEl("h3", { text: "OnProgram Board" });
    header.createSpan({
      text: hiddenCardCount > 0
        ? `${visibleCardCount} shown · ${hiddenCardCount} hidden`
        : `${visibleCardCount} ${visibleCardCount === 1 ? "card" : "cards"}`,
      cls: "onprogram-board-count"
    });

    if (result.invalid.length > 0) {
      header.createSpan({
        text: `${result.invalid.length} invalid`,
        cls: "onprogram-board-invalid-count"
      });
    }

    const headerActions = header.createDiv({ cls: "onprogram-board-header-actions" });

    const statusesButton = headerActions.createEl("button", {
      text: `Statuses ${statusPreferences.visible.length}/${WORK_ITEM_STATUSES.length}`
    });
    statusesButton.setAttr("title", "Choose which status columns this Board shows");
    statusesButton.addEventListener("click", () => this.configureStatuses());

    const addTask = headerActions.createEl("button", { text: "+ Add" });
    addTask.setAttr("title", "Add a task or link another OnProgram Base");
    addTask.addEventListener("click", () => this.createTask());

    const board = this.hostEl.createDiv({ cls: "onprogram-board" });

    for (const status of statusPreferences.order) {
      if (!visibleStatuses.has(status)) continue;
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
      ? "Double-click to open the linked OnProgram Base. Right-click for project and Base actions."
      : "Double-click to open this task. Right-click for project and Base actions.");

    card.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (item.linkedBase) {
        void this.openLinkedBase(item.linkedBase);
      } else {
        this.openItem(item.source.path);
      }
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
      onBatchLoad: () => {
        new BatchTaskImportModal(this.app, {
          taskCreator: this.taskCreator,
          targetFolder: this.getConfiguredTaskFolder(),
          onError: (error) => this.errorHandler.handle(error, "batch load board tasks", true)
        }).open();
      },
      onLinkMarkdown: async (file, label) => {
        openLinkedMarkdownCreateFlow(
          this.app,
          this.linkedMarkdownStore,
          this.errorHandler,
          { initialFile: file, initialLabel: label }
        );
      },
      onLinkBase: async (baseFile) => {
        this.addLinkedBaseCard(baseFile.path, initialStatus ?? "todo");
        new Notice(`OnProgram: Added linked Base ${linkedBaseTitle(baseFile.name)}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "add board item", true)
    }).open();
  }

  private configureStatuses(): void {
    new BoardStatusSelectorModal(this.app, {
      preferences: this.getStatusPreferences(),
      onApply: (preferences) => this.persistStatusPreferences(preferences)
    }).open();
  }

  private getStatusPreferences(): BoardStatusPreferences {
    return parseBoardStatusPreferences(this.config.get("boardStatusPreferences"));
  }

  private persistStatusPreferences(preferences: BoardStatusPreferences): void {
    this.config.set(
      "boardStatusPreferences",
      serializeBoardStatusPreferences(preferences)
    );
    this.render();
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

    if (item.type !== "project") {
      this.projectAssignment.addProjectMenuItem(menu, item);
      menu.addSeparator();
    }

    this.addPillMenu(menu, item);
    menu.addSeparator();

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

  private addPillMenu(menu: Menu, item: WorkItem): void {
    menu.addItem((menuItem) => {
      menuItem
        .setTitle("Add pill")
        .setIcon("tag");

      const submenu = (
        menuItem as unknown as { setSubmenu(): Menu }
      ).setSubmenu();

      for (const type of this.getAvailablePillTypes()) {
        submenu.addItem((subItem) => subItem
          .setTitle(humanizePillType(type))
          .setIcon("tag")
          .onClick(() => this.openAddPillModal(item, type)));
      }

      submenu.addSeparator();
      submenu.addItem((subItem) => subItem
        .setTitle("Custom…")
        .setIcon("plus")
        .onClick(() => this.openAddPillModal(item)));
    });

    if (item.pills.length === 0) return;

    menu.addItem((menuItem) => {
      menuItem
        .setTitle(`Remove pill (${item.pills.length})`)
        .setIcon("tags");

      const submenu = (
        menuItem as unknown as { setSubmenu(): Menu }
      ).setSubmenu();

      item.pills.forEach((pill, index) => {
        submenu.addItem((subItem) => subItem
          .setTitle(`${humanizePillType(pill.type)} — ${pill.value}`)
          .setIcon("x")
          .onClick(() => void this.removePill(item, index)));
      });
    });
  }

  private getAvailablePillTypes(): string[] {
    const result = this.adapter.adapt(this.data);
    const seen = new Set<string>();
    const types: string[] = [];

    const add = (value: string): void => {
      const trimmed = value.trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) return;
      seen.add(key);
      types.push(trimmed);
    };

    for (const type of DEFAULT_WORK_ITEM_PILL_TYPES) add(type);

    const customTypes = result.items
      .flatMap((candidate) => candidate.pills.map((pill) => pill.type))
      .filter((type) => !seen.has(type.trim().toLowerCase()))
      .sort((left, right) => left.localeCompare(right));

    for (const type of customTypes) add(type);
    return types;
  }

  private openAddPillModal(item: WorkItem, type?: string): void {
    new AddBoardPillModal(this.app, type, (pill) => {
      void this.addPill(item, pill);
    }).open();
  }

  private async addPill(item: WorkItem, pill: WorkItemPill): Promise<void> {
    if (this.writing) return;

    const duplicate = item.pills.some((candidate) =>
      candidate.type.trim().toLowerCase() === pill.type.trim().toLowerCase()
      && candidate.value.trim().toLowerCase() === pill.value.trim().toLowerCase()
    );
    if (duplicate) {
      new Notice(`OnProgram: ${humanizePillType(pill.type)} '${pill.value}' is already on this card.`);
      return;
    }

    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, {
        pills: [...item.pills, pill]
      });
      new Notice(`OnProgram: added ${humanizePillType(pill.type)} '${pill.value}'.`);
    } catch (error) {
      this.errorHandler.handle(error, "add board card pill", true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }

  private async removePill(item: WorkItem, index: number): Promise<void> {
    if (this.writing) return;
    const pill = item.pills[index];
    if (!pill) return;

    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, {
        pills: item.pills.filter((_, candidateIndex) => candidateIndex !== index)
      });
      new Notice(`OnProgram: removed ${humanizePillType(pill.type)} '${pill.value}'.`);
    } catch (error) {
      this.errorHandler.handle(error, "remove board card pill", true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
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

class AddBoardPillModal extends Modal {
  private typeValue: string;
  private pillValue = "";

  constructor(
    app: App,
    private readonly fixedType: string | undefined,
    private readonly onSubmit: (pill: WorkItemPill) => void
  ) {
    super(app);
    this.typeValue = fixedType ?? "";
  }

  onOpen(): void {
    this.contentEl.empty();
    this.modalEl.addClass("onprogram-board-add-pill-modal");

    this.contentEl.createEl("h2", {
      text: this.fixedType
        ? `Add ${humanizePillType(this.fixedType)} pill`
        : "Add custom pill"
    });

    if (!this.fixedType) {
      new Setting(this.contentEl)
        .setName("Type")
        .setDesc("Reusable pill group, for example department or campaign.")
        .addText((text) => {
          text
            .setPlaceholder("department")
            .setValue(this.typeValue)
            .onChange((value) => { this.typeValue = value; });
          text.inputEl.addEventListener("keydown", (event) => this.handleEnter(event));
        });
    }

    new Setting(this.contentEl)
      .setName("Value")
      .setDesc(this.fixedType
        ? `Value for this ${humanizePillType(this.fixedType)} pill.`
        : "Text shown on the Board card.")
      .addText((text) => {
        text
          .setPlaceholder(this.fixedType === "software" ? "Obsidian" : "Pill value")
          .setValue(this.pillValue)
          .onChange((value) => { this.pillValue = value; });
        text.inputEl.addEventListener("keydown", (event) => this.handleEnter(event));
        window.setTimeout(() => text.inputEl.focus(), 0);
      });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText("Add pill")
        .setCta()
        .onClick(() => this.submit()))
      .addButton((button) => button
        .setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private handleEnter(event: KeyboardEvent): void {
    if (event.key !== "Enter") return;
    event.preventDefault();
    this.submit();
  }

  private submit(): void {
    const type = this.typeValue.trim();
    const value = this.pillValue.trim();

    if (!type) {
      new Notice("OnProgram: choose a pill type.");
      return;
    }
    if (!value) {
      new Notice("OnProgram: enter a pill value.");
      return;
    }

    this.onSubmit({ type, value });
    this.close();
  }
}

function linkedBaseTitle(pathOrName: string): string {
  const name = pathOrName.split("/").pop() ?? pathOrName;
  return name.replace(/\.onprogram\.base$/i, "").replace(/\.base$/i, "");
}

function humanizePillType(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}