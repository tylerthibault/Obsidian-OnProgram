import { Modal, Notice, Setting, type App } from "obsidian";

export interface CreateMilestoneModalOptions {
  projectTitle: string;
  onSubmit: (title: string, due: string) => Promise<void>;
  onError: (error: unknown) => void;
}

export class CreateMilestoneModal extends Modal {
  private title = "";
  private due = "";
  private busy = false;

  constructor(
    app: App,
    private readonly options: CreateMilestoneModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "New milestone" });
    this.contentEl.createEl("p", {
      text: `Create a checkpoint for ${this.options.projectTitle}.`,
      cls: "onprogram-editor-source"
    });

    new Setting(this.contentEl)
      .setName("Milestone")
      .addText((text) => {
        text.setPlaceholder("Launch").onChange((value) => { this.title = value; });
        text.inputEl.focus();
      });

    new Setting(this.contentEl)
      .setName("Due date")
      .setDesc("Milestones always have a due date.")
      .addText((text) => {
        text.setPlaceholder("YYYY-MM-DD").onChange((value) => { this.due = value; });
        text.inputEl.type = "date";
      });

    const actions = this.contentEl.createDiv({ cls: "onprogram-editor-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());
    const create = actions.createEl("button", { text: "Create milestone", cls: "mod-cta" });
    create.addEventListener("click", () => void this.submit());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(): Promise<void> {
    if (this.busy) return;
    const title = this.title.trim();
    const due = this.due.trim();
    if (!title) {
      new Notice("OnProgram: Give the milestone a name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      new Notice("OnProgram: Choose a due date for the milestone.");
      return;
    }

    this.busy = true;
    try {
      await this.options.onSubmit(title, due);
      this.close();
    } catch (error) {
      this.options.onError(error);
    } finally {
      this.busy = false;
    }
  }
}
