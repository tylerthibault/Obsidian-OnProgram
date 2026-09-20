import { Modal, Setting, TFile, type App } from "obsidian";
import { MarkdownFilePickerModal } from "./MarkdownFilePickerModal";
import { OnProgramBasePickerModal } from "./OnProgramBasePickerModal";

export interface CreateTaskModalOptions {
  onSubmit: (title: string) => Promise<void>;
  onError: (error: unknown) => void;
  /** When provided, the modal can add an existing OnProgram Base instead of creating a note. */
  onLinkBase?: (baseFile: TFile) => Promise<void>;
  /** Required so every OnProgram add flow can create an instance pointing at an existing Markdown note. */
  onLinkMarkdown: (file: TFile, label?: string) => Promise<void>;
}

type CreateMode = "task" | "linked-base" | "linked-markdown";

export class CreateTaskModal extends Modal {
  private title = "";
  private mode: CreateMode = "task";
  private selectedBase?: TFile;
  private selectedMarkdown?: TFile;
  private linkedMarkdownLabel = "";
  private submitting = false;

  constructor(
    app: App,
    private readonly options: CreateTaskModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("onprogram-create-task-modal");

    contentEl.createEl("h2", { text: "Add to OnProgram" });
    this.renderModeChooser();

    if (this.mode === "linked-base" && this.options.onLinkBase) {
      this.renderLinkedBase();
    } else if (this.mode === "linked-markdown") {
      this.renderLinkedMarkdown();
    } else {
      this.renderTask();
    }

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText(this.submitLabel())
          .setCta()
          .onClick(() => {
            void this.submit();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Cancel")
          .onClick(() => this.close())
      );
  }

  private renderModeChooser(): void {
    const setting = new Setting(this.contentEl)
      .setName("What do you want to add?")
      .setDesc(this.modeDescription());

    setting.addButton((button) => {
      button
        .setButtonText("Create new file")
        .setTooltip("Create a new OnProgram Markdown task")
        .onClick(() => {
          this.mode = "task";
          this.render();
        });

      if (this.mode === "task") button.setCta();
    });

    setting.addButton((button) => {
      button
        .setButtonText("Link existing file")
        .setTooltip("Create another OnProgram appearance that points at an existing Markdown note")
        .onClick(() => {
          this.mode = "linked-markdown";
          this.render();
        });

      if (this.mode === "linked-markdown") button.setCta();
    });

    if (this.options.onLinkBase) {
      setting.addButton((button) => {
        button
          .setButtonText("Link Base")
          .setTooltip("Link directly to another OnProgram Base")
          .onClick(() => {
            this.mode = "linked-base";
            this.render();
          });

        if (this.mode === "linked-base") button.setCta();
      });
    }
  }

  private renderTask(): void {
    new Setting(this.contentEl)
      .setName("Title")
      .setDesc("The task title is also used as the Markdown filename.")
      .addText((text) => {
        text
          .setPlaceholder("What needs to be done?")
          .setValue(this.title)
          .onChange((value) => {
            this.title = value;
          });

        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void this.submit();
          }
        });

        window.setTimeout(() => text.inputEl.focus(), 0);
      });
  }

  private renderLinkedBase(): void {
    new Setting(this.contentEl)
      .setName("OnProgram Base")
      .setDesc(
        this.selectedBase
          ? this.selectedBase.path
          : "No Markdown task will be created. The Board card will open this Base directly."
      )
      .addButton((button) => button
        .setButtonText(this.selectedBase ? "Change" : "Choose")
        .onClick(() => {
          new OnProgramBasePickerModal(this.app, (baseFile) => {
            this.selectedBase = baseFile;
            this.render();
          }).open();
        }));
  }

  private renderLinkedMarkdown(): void {
    new Setting(this.contentEl)
      .setName("Markdown note")
      .setDesc(
        this.selectedMarkdown
          ? this.selectedMarkdown.path
          : "Choose any existing Markdown note. No copy of the note will be created."
      )
      .addButton((button) => button
        .setButtonText(this.selectedMarkdown ? "Change" : "Choose")
        .onClick(() => {
          new MarkdownFilePickerModal(this.app, (file) => {
            this.selectedMarkdown = file;
            this.render();
          }).open();
        }));

    new Setting(this.contentEl)
      .setName("Label")
      .setDesc("Optional purpose for this appearance, such as TikTok, Repost, Review, or Reminder.")
      .addText((text) => text
        .setPlaceholder("Optional")
        .setValue(this.linkedMarkdownLabel)
        .onChange((value) => {
          this.linkedMarkdownLabel = value;
        }));
  }

  private modeDescription(): string {
    if (this.mode === "linked-base") {
      return "Link directly to another OnProgram Base without creating a Markdown task.";
    }
    if (this.mode === "linked-markdown") {
      return "Create another OnProgram appearance that points at an existing Markdown note.";
    }
    return "Create a brand-new Markdown file for this task.";
  }

  private submitLabel(): string {
    if (this.mode === "linked-base") return "Add Base";
    if (this.mode === "linked-markdown") return "Add Link";
    return "Create";
  }

  private async submit(): Promise<void> {
    if (this.submitting) return;
    this.submitting = true;

    try {
      if (this.mode === "linked-base" && this.options.onLinkBase) {
        if (!this.selectedBase) {
          throw new Error("Choose an OnProgram Base to link.");
        }
        await this.options.onLinkBase(this.selectedBase);
      } else if (this.mode === "linked-markdown") {
        if (!this.selectedMarkdown) {
          throw new Error("Choose a Markdown note to link.");
        }
        await this.options.onLinkMarkdown(
          this.selectedMarkdown,
          this.linkedMarkdownLabel.trim() || undefined
        );
      } else {
        await this.options.onSubmit(this.title);
      }

      this.close();
    } catch (error) {
      this.options.onError(error);
    } finally {
      this.submitting = false;
    }
  }
}
