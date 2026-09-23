import { Modal, Notice, Setting, type App } from "obsidian";
import { WORK_ITEM_STATUSES, type WorkItemStatus } from "../models/work-item/WorkItemStatus";
import type { BoardStatusPreferences } from "../services/bases/BoardStatusPreferences";

export interface BoardStatusSelectorModalOptions {
  preferences: BoardStatusPreferences;
  onApply: (preferences: BoardStatusPreferences) => void;
}

export class BoardStatusSelectorModal extends Modal {
  private order: WorkItemStatus[];
  private visible: Set<WorkItemStatus>;

  constructor(
    app: App,
    private readonly options: BoardStatusSelectorModalOptions
  ) {
    super(app);
    this.order = [...options.preferences.order];
    this.visible = new Set(options.preferences.visible);
  }

  onOpen(): void {
    this.modalEl.addClass("onprogram-board-status-modal-shell");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-board-status-modal");
    this.contentEl.createEl("h2", { text: "Board statuses" });
    this.contentEl.createEl("p", {
      text: "Choose which status columns this Board shows and arrange them in the order you want. Hidden statuses keep their tasks unchanged."
    });

    const actions = this.contentEl.createDiv({ cls: "onprogram-board-status-actions" });
    const showAll = actions.createEl("button", { text: "Show all" });
    showAll.addEventListener("click", () => {
      this.visible = new Set(this.order);
      this.render();
    });

    const reset = actions.createEl("button", { text: "Reset order" });
    reset.addEventListener("click", () => {
      this.order = [...WORK_ITEM_STATUSES];
      this.render();
    });

    const list = this.contentEl.createDiv({ cls: "onprogram-board-status-list" });
    this.order.forEach((status, index) => {
      const row = list.createDiv({ cls: "onprogram-board-status-row" });
      const setting = new Setting(row)
        .setName(humanize(status))
        .setDesc(status);

      setting.addToggle((toggle) => {
        toggle.setValue(this.visible.has(status));
        toggle.onChange((value) => {
          if (!value && this.visible.size === 1 && this.visible.has(status)) {
            new Notice("OnProgram: Keep at least one Board status visible.");
            toggle.setValue(true);
            return;
          }
          if (value) this.visible.add(status);
          else this.visible.delete(status);
        });
      });

      setting.addButton((button) => button
        .setButtonText("↑")
        .setTooltip("Move left")
        .setDisabled(index === 0)
        .onClick(() => this.move(status, -1)));

      setting.addButton((button) => button
        .setButtonText("↓")
        .setTooltip("Move right")
        .setDisabled(index === this.order.length - 1)
        .onClick(() => this.move(status, 1)));
    });

    new Setting(this.contentEl)
      .addButton((button) => button
        .setButtonText("Apply")
        .setCta()
        .onClick(() => {
          this.options.onApply({
            order: [...this.order],
            visible: this.order.filter((status) => this.visible.has(status))
          });
          this.close();
        }))
      .addButton((button) => button
        .setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  private move(status: WorkItemStatus, offset: -1 | 1): void {
    const index = this.order.indexOf(status);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.order.length) return;

    const next = [...this.order];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
    this.order = next;
    this.render();
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
