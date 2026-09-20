import { Modal, Notice, Setting, TFile, type App } from "obsidian";
import { localDateIso, localTimeIso } from "../utils/dateTime";
import { MarkdownFilePickerModal } from "./MarkdownFilePickerModal";

export interface LinkedMarkdownInstanceDraft {
  file: TFile;
  scheduled: string;
  label?: string;
  durationMinutes?: number;
}

export interface LinkedMarkdownInstanceModalOptions {
  heading?: string;
  initialFile?: TFile;
  initialScheduled?: string;
  initialLabel?: string;
  initialDurationMinutes?: number;
  onSubmit: (draft: LinkedMarkdownInstanceDraft) => void | Promise<void>;
  onError?: (error: unknown) => void;
}

export class LinkedMarkdownInstanceModal extends Modal {
  private selectedFile?: TFile;
  private label = "";
  private dateValue = "";
  private timeValue = "";
  private allDay = false;
  private durationMinutes = 60;
  private submitting = false;

  constructor(
    app: App,
    private readonly options: LinkedMarkdownInstanceModalOptions
  ) {
    super(app);

    this.selectedFile = options.initialFile;
    this.label = options.initialLabel ?? "";
    this.durationMinutes = options.initialDurationMinutes ?? 60;

    const parsed = parseSchedule(options.initialScheduled);
    const initial = parsed?.date ?? new Date();
    this.dateValue = localDateIso(initial);
    this.timeValue = parsed?.time ?? localTimeIso(initial);
    this.allDay = parsed?.allDay ?? false;
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
    contentEl.addClass("onprogram-linked-markdown-modal");

    contentEl.createEl("h2", {
      text: this.options.heading ?? "Linked Markdown instance"
    });
    contentEl.createEl("p", {
      text: "Create an independent OnProgram appearance that opens an existing Markdown note. The note itself is not duplicated or rescheduled."
    });

    new Setting(contentEl)
      .setName("Markdown note")
      .setDesc(
        this.selectedFile
          ? this.selectedFile.path
          : "Choose any Markdown file in the vault."
      )
      .addButton((button) => button
        .setButtonText(this.selectedFile ? "Change" : "Choose")
        .onClick(() => {
          new MarkdownFilePickerModal(this.app, (file) => {
            this.selectedFile = file;
            this.render();
          }).open();
        }));

    new Setting(contentEl)
      .setName("Label")
      .setDesc("Optional purpose for this instance, such as TikTok, Newsletter, Review, Repost, or Reminder.")
      .addText((text) => text
        .setPlaceholder("Optional")
        .setValue(this.label)
        .onChange((value) => {
          this.label = value;
        }));

    new Setting(contentEl)
      .setName("Date")
      .addText((text) => {
        text.inputEl.type = "date";
        text.setValue(this.dateValue).onChange((value) => {
          this.dateValue = value;
        });
      });

    new Setting(contentEl)
      .setName("All day")
      .setDesc("When enabled, this instance appears in the all-day area instead of a timed slot.")
      .addToggle((toggle) => toggle
        .setValue(this.allDay)
        .onChange((value) => {
          this.allDay = value;
          this.render();
        }));

    if (!this.allDay) {
      new Setting(contentEl)
        .setName("Time")
        .addText((text) => {
          text.inputEl.type = "time";
          text.setValue(this.timeValue).onChange((value) => {
            this.timeValue = value;
          });
        });

      new Setting(contentEl)
        .setName("Duration")
        .setDesc("Minutes for this Calendar instance. This does not change the linked note.")
        .addText((text) => {
          text.inputEl.type = "number";
          text.inputEl.min = "1";
          text.setValue(String(this.durationMinutes)).onChange((value) => {
            const parsed = Number(value);
            if (Number.isFinite(parsed) && parsed > 0) {
              this.durationMinutes = Math.round(parsed);
            }
          });
        });
    }

    new Setting(contentEl)
      .addButton((button) => button
        .setButtonText("Save")
        .setCta()
        .onClick(() => void this.submit()))
      .addButton((button) => button
        .setButtonText("Cancel")
        .onClick(() => this.close()));
  }

  private async submit(): Promise<void> {
    if (this.submitting) return;

    if (!this.selectedFile) {
      new Notice("OnProgram: choose a Markdown note.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.dateValue)) {
      new Notice("OnProgram: choose a valid date.");
      return;
    }

    if (!this.allDay && !/^\d{2}:\d{2}$/.test(this.timeValue)) {
      new Notice("OnProgram: choose a valid time.");
      return;
    }

    this.submitting = true;
    try {
      await this.options.onSubmit({
        file: this.selectedFile,
        scheduled: this.allDay
          ? this.dateValue
          : `${this.dateValue}T${this.timeValue}`,
        label: this.label.trim() || undefined,
        durationMinutes: this.allDay ? undefined : this.durationMinutes
      });
      this.close();
    } catch (error) {
      this.options.onError?.(error);
      if (!this.options.onError) {
        new Notice("OnProgram: could not save the linked Markdown instance.");
      }
    } finally {
      this.submitting = false;
    }
  }
}

function parseSchedule(value: string | undefined): {
  date: Date;
  time: string;
  allDay: boolean;
} | undefined {
  if (!value) return undefined;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 9, 0);
    return { date, time: "09:00", allDay: true };
  }

  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!dateTime) return undefined;

  const [, year, month, day, hour, minute] = dateTime;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );

  return {
    date,
    time: `${hour}:${minute}`,
    allDay: false
  };
}

