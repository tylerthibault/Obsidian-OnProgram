import { Modal, Setting, type App } from "obsidian";

export interface CreateTaskModalOptions {
  onSubmit: (title: string) => Promise<void>;
  onError: (error: unknown) => void;
}

export class CreateTaskModal extends Modal {
  private title = "";
  private submitting = false;

  constructor(
    app: App,
    private readonly options: CreateTaskModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("onprogram-create-task-modal");
    contentEl.createEl("h2", { text: "Create OnProgram task" });

    new Setting(contentEl)
      .setName("Title")
      .setDesc("The task title is also used as the Markdown filename.")
      .addText((text) => {
        text
          .setPlaceholder("What needs to be done?")
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

    new Setting(contentEl)
      .addButton((button) =>
        button
          .setButtonText("Create")
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

  onClose(): void {
    this.contentEl.empty();
  }

  private async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.submitting = true;

    try {
      await this.options.onSubmit(this.title);
      this.close();
    } catch (error) {
      this.options.onError(error);
    } finally {
      this.submitting = false;
    }
  }
}
