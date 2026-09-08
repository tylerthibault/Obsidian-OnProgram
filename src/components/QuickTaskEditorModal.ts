import { Modal, Notice, Setting, type App } from "obsidian";
import type { WorkItem } from "../models/work-item/WorkItem";
import { WORK_ITEM_PRIORITIES } from "../models/work-item/WorkItemPriority";
import { getWorkItemTypeSchema } from "../models/work-item/WorkItemSchema";
import type { ErrorHandler } from "../core/ErrorHandler";
import type {
  WorkItemEditorDraft,
  WorkItemEditorService
} from "../services/work-items/WorkItemEditorService";

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
