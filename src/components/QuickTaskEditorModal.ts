import { Modal, Notice, Setting, type App } from "obsidian";
import type { WorkItem } from "../models/work-item/WorkItem";
import {
  WORK_ITEM_PILL_COLORS,
  type WorkItemPill,
  type WorkItemPillColor
} from "../models/work-item/WorkItemPill";
import { WORK_ITEM_PRIORITIES } from "../models/work-item/WorkItemPriority";
import { getWorkItemTypeSchema } from "../models/work-item/WorkItemSchema";
import type { ErrorHandler } from "../core/ErrorHandler";
import type {
  WorkItemEditorDraft,
  WorkItemEditorService
} from "../services/work-items/WorkItemEditorService";
import { OnProgramBasePickerModal } from "./OnProgramBasePickerModal";

export class QuickTaskEditorModal extends Modal {
  private draft?: WorkItemEditorDraft;
  private busy = false;

  constructor(
    app: App,
    private readonly item: WorkItem,
    private readonly editor: WorkItemEditorService,
    private readonly errorHandler: ErrorHandler
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.modalEl.addClass("onprogram-editor-modal");
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: `Edit ${this.item.type}` });
    this.contentEl.createEl("p", {
      text: this.item.source.path,
      cls: "onprogram-editor-source"
    });

    try {
      this.draft = await this.editor.loadDraft(this.item);
      this.renderForm();
    } catch (error) {
      this.errorHandler.handle(error, "open quick editor", true);
      this.close();
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderForm(): void {
    const draft = this.draft;
    if (!draft) return;

    new Setting(this.contentEl)
      .setName("Title")
      .addText((text) => text
        .setValue(draft.title)
        .onChange((value) => { draft.title = value; }));

    new Setting(this.contentEl)
      .setName("Status")
      .addDropdown((dropdown) => {
        for (const status of getWorkItemTypeSchema(this.item.type).allowedStatuses) {
          dropdown.addOption(status, humanize(status));
        }
        dropdown.setValue(draft.status).onChange((value) => {
          draft.status = value as WorkItemEditorDraft["status"];
        });
      });

    new Setting(this.contentEl)
      .setName("Project")
      .addText((text) => text
        .setPlaceholder("Project reference")
        .setValue(draft.project)
        .onChange((value) => { draft.project = value; }));

    let linkedBaseInput: HTMLInputElement | undefined;
    const linkedBaseSetting = new Setting(this.contentEl)
      .setName("Linked OnProgram Base")
      .setDesc("Optional child Base opened when drilling into this task.");
    linkedBaseSetting.addText((text) => {
      linkedBaseInput = text.inputEl;
      text
        .setPlaceholder("Folder/Project.onprogram.base")
        .setValue(draft.linkedBase)
        .onChange((value) => { draft.linkedBase = value; });
    });
    linkedBaseSetting.addButton((button) => button
      .setButtonText("Choose")
      .onClick(() => {
        new OnProgramBasePickerModal(this.app, (file) => {
          draft.linkedBase = file.path;
          if (linkedBaseInput) linkedBaseInput.value = file.path;
        }).open();
      }));
    if (draft.linkedBase) {
      linkedBaseSetting.addButton((button) => button
        .setButtonText("Clear")
        .onClick(() => {
          draft.linkedBase = "";
          if (linkedBaseInput) linkedBaseInput.value = "";
        }));
    }

    new Setting(this.contentEl)
      .setName("Priority")
      .addDropdown((dropdown) => {
        for (const priority of WORK_ITEM_PRIORITIES) {
          dropdown.addOption(priority, humanize(priority));
        }
        dropdown.setValue(draft.priority).onChange((value) => {
          draft.priority = value as WorkItemEditorDraft["priority"];
        });
      });

    this.renderPillEditor(draft);

    this.addDateSetting("Start", draft.start, (value) => { draft.start = value; });
    this.addDateSetting("Due", draft.due, (value) => { draft.due = value; });
    this.addDateSetting("Scheduled", draft.scheduled, (value) => { draft.scheduled = value; });

    new Setting(this.contentEl)
      .setName("Duration")
      .setDesc("Minutes or values such as 1h 30m")
      .addText((text) => text
        .setPlaceholder("90 or 1h 30m")
        .setValue(draft.duration)
        .onChange((value) => { draft.duration = value; }));

    new Setting(this.contentEl)
      .setName("Notes")
      .setDesc("Markdown body of the backing note")
      .addTextArea((area) => {
        area.setValue(draft.notes).onChange((value) => { draft.notes = value; });
        area.inputEl.rows = 10;
        area.inputEl.addClass("onprogram-editor-notes");
      });

    const actions = this.contentEl.createDiv({ cls: "onprogram-editor-actions" });

    const openButton = actions.createEl("button", { text: "Open file" });
    openButton.addEventListener("click", () => void this.run(async () => {
      await this.editor.openSource(this.item);
      this.close();
    }));

    const archiveButton = actions.createEl("button", { text: "Archive" });
    archiveButton.addEventListener("click", () => void this.run(async () => {
      await this.editor.archive(this.item);
      new Notice(`OnProgram: archived ${this.item.title}.`);
      this.close();
    }));

    const trashButton = actions.createEl("button", {
      text: "Move to Trash",
      cls: "mod-warning"
    });
    trashButton.addEventListener("click", () => {
      const confirmed = window.confirm(`Move '${this.item.title}' to Trash?`);
      if (!confirmed) return;
      void this.run(async () => {
        await this.editor.trash(this.item);
        new Notice(`OnProgram: moved ${this.item.title} to Trash.`);
        this.close();
      });
    });

    const spacer = actions.createSpan({ cls: "onprogram-editor-actions-spacer" });
    spacer.setText("");

    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", {
      text: "Save",
      cls: "mod-cta"
    });
    saveButton.addEventListener("click", () => void this.run(async () => {
      if (!this.draft) return;
      const result = await this.editor.save({ item: this.item, draft: this.draft });
      new Notice(`OnProgram: saved ${result.file.basename}.`);
      this.close();
    }));
  }

  private renderPillEditor(draft: WorkItemEditorDraft): void {
    const section = this.contentEl.createDiv({ cls: "onprogram-editor-pills" });
    this.renderPillEditorContents(section, draft);
  }

  private renderPillEditorContents(
    section: HTMLElement,
    draft: WorkItemEditorDraft
  ): void {
    section.empty();

    const header = section.createDiv({ cls: "onprogram-editor-pills-header" });
    const copy = header.createDiv();
    copy.createEl("strong", { text: "Pills" });
    copy.createDiv({
      text: "Descriptive metadata shown as Board and Calendar pills. Type controls the group; value is the visible label.",
      cls: "onprogram-editor-pills-description"
    });

    const add = header.createEl("button", { text: "+ Add pill" });
    add.addEventListener("click", () => {
      draft.pills.push({ type: "software", value: "" });
      this.renderPillEditorContents(section, draft);
    });

    if (draft.pills.length === 0) {
      section.createDiv({
        text: "No dynamic pills yet.",
        cls: "onprogram-editor-pills-empty"
      });
      return;
    }

    const rows = section.createDiv({ cls: "onprogram-editor-pill-list" });
    draft.pills.forEach((pill, index) => {
      this.renderPillRow(rows, section, draft, pill, index);
    });
  }

  private renderPillRow(
    parent: HTMLElement,
    section: HTMLElement,
    draft: WorkItemEditorDraft,
    pill: WorkItemPill,
    index: number
  ): void {
    const row = parent.createDiv({ cls: "onprogram-editor-pill-row" });

    const type = row.createEl("input", { type: "text", value: pill.type });
    type.placeholder = "Type (software)";
    type.setAttr("aria-label", "Pill type");
    type.addEventListener("input", () => {
      pill.type = type.value;
    });

    const value = row.createEl("input", { type: "text", value: pill.value });
    value.placeholder = "Value (Obsidian)";
    value.setAttr("aria-label", "Pill value");
    value.addEventListener("input", () => {
      pill.value = value.value;
    });

    const color = row.createEl("select");
    color.setAttr("aria-label", "Pill color");
    color.createEl("option", { text: "Auto color", value: "" });
    for (const option of WORK_ITEM_PILL_COLORS) {
      color.createEl("option", { text: humanize(option), value: option });
    }
    color.value = pill.color ?? "";
    color.addEventListener("change", () => {
      if (color.value) pill.color = color.value as WorkItemPillColor;
      else delete pill.color;
    });

    const icon = row.createEl("input", { type: "text", value: pill.icon ?? "" });
    icon.placeholder = "Icon (optional)";
    icon.setAttr("aria-label", "Pill icon");
    icon.addEventListener("input", () => {
      const next = icon.value.trim();
      if (next) pill.icon = next;
      else delete pill.icon;
    });

    const up = row.createEl("button", { text: "↑" });
    up.setAttr("aria-label", "Move pill up");
    up.disabled = index === 0;
    up.addEventListener("click", () => {
      if (index === 0) return;
      [draft.pills[index - 1], draft.pills[index]] = [draft.pills[index]!, draft.pills[index - 1]!];
      this.renderPillEditorContents(section, draft);
    });

    const down = row.createEl("button", { text: "↓" });
    down.setAttr("aria-label", "Move pill down");
    down.disabled = index === draft.pills.length - 1;
    down.addEventListener("click", () => {
      if (index >= draft.pills.length - 1) return;
      [draft.pills[index], draft.pills[index + 1]] = [draft.pills[index + 1]!, draft.pills[index]!];
      this.renderPillEditorContents(section, draft);
    });

    const remove = row.createEl("button", { text: "×" });
    remove.setAttr("aria-label", "Remove pill");
    remove.addClass("mod-warning");
    remove.addEventListener("click", () => {
      draft.pills.splice(index, 1);
      this.renderPillEditorContents(section, draft);
    });
  }

  private addDateSetting(
    name: string,
    value: string,
    onChange: (value: string) => void
  ): void {
    new Setting(this.contentEl)
      .setName(name)
      .setDesc("YYYY-MM-DD or YYYY-MM-DDTHH:mm")
      .addText((text) => text
        .setPlaceholder("2026-09-08 or 2026-09-08T13:30")
        .setValue(value)
        .onChange(onChange));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.modalEl.addClass("onprogram-is-busy");

    try {
      await action();
    } catch (error) {
      this.errorHandler.handle(error, "quick task editor", true);
    } finally {
      this.busy = false;
      this.modalEl.removeClass("onprogram-is-busy");
    }
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
