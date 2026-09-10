import { Modal, Setting, TFile, type App } from "obsidian";
import { OnProgramBasePickerModal } from "./OnProgramBasePickerModal";

export interface CreateTaskModalOptions {
  onSubmit: (title: string) => Promise<void>;
  onError: (error: unknown) => void;
  /** When provided, the modal can add an existing OnProgram Base instead of creating a note. */
  onLinkBase?: (baseFile: TFile) => Promise<void>;
}

type CreateMode = "task" | "linked-base";

export class CreateTaskModal extends Modal {
  private title = "";
  private mode: CreateMode = "task";
  private selectedBase?: TFile;
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
    contentEl.createEl("h2", {
      text: this.options.onLinkBase ? "Add to OnProgram" : "Create OnProgram task"
    });

    if (this.options.onLinkBase) {
      new Setting(contentEl)
        .setName("Add")
        .setDesc("Create a Markdown task or link this Board directly to another OnProgram Base.")
        .addDropdown((dropdown) => {
          dropdown
            .addOption("task", "Task")
            .addOption("linked-base", "Linked Base")
            .setValue(this.mode)
            .onChange((value) => {
              this.mode = value === "linked-base" ? "linked-base" : "task";
              this.render();
            });
        });
    }

    if (this.mode === "linked-base" && this.options.onLinkBase) {
      new Setting(contentEl)
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
    } else {
      new Setting(contentEl)
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

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText(this.mode === "linked-base" ? "Add Base" : "Create")
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

  private async submit(): Promise<void> {
    if (this.submitting) return;
    this.submitting = true;

    try {
      if (this.mode === "linked-base" && this.options.onLinkBase) {
        if (!this.selectedBase) {
          throw new Error("Choose an OnProgram Base to link.");
        }
        await this.options.onLinkBase(this.selectedBase);
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
