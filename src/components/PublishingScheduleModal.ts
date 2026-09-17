import { Modal, Setting, type App } from "obsidian";
import type { PublishingPlatformDefinition } from "../models/publishing/PublishingPlatform";

export class PublishingScheduleModal extends Modal {
  private value: string;

  constructor(
    app: App,
    private readonly platform: PublishingPlatformDefinition,
    initialValue: string | undefined,
    private readonly onSave: (value: string) => void
  ) {
    super(app);
    this.value = normalizeDateTimeLocal(initialValue) ?? localDateTimeIso(new Date());
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: `Schedule for ${this.platform.name}` });
    this.contentEl.createEl("p", {
      text: "Choose the platform-specific publish date and time."
    });

    new Setting(this.contentEl)
      .setName("Publish date and time")
      .addText((text) => {
        text.inputEl.type = "datetime-local";
        text
          .setValue(this.value)
          .onChange((value) => { this.value = value; });
      });

    const actions = this.contentEl.createDiv({ cls: "onprogram-editor-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => this.close());

    const save = actions.createEl("button", { text: "Schedule", cls: "mod-cta" });
    save.addEventListener("click", () => {
      const normalized = normalizeDateTimeLocal(this.value);
      if (!normalized) return;
      this.onSave(normalized);
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

function normalizeDateTimeLocal(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}T${match[2]}:${match[3]}` : undefined;
}

function localDateTimeIso(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes())
  ].join("");
}
