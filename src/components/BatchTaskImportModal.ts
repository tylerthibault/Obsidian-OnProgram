import { Modal, Notice, Setting, type App } from "obsidian";
import { OnProgramError } from "../core/ErrorHandler";
import type { WorkItemDateValue } from "../models/work-item/WorkItemDates";
import type { TaskCreator } from "../services/work-items/TaskCreator";

export interface BatchTaskImportModalOptions {
  taskCreator: TaskCreator;
  targetFolder?: string;
  onError: (error: unknown) => void;
}

interface BatchRow {
  rowNumber: number;
  title: string;
  date?: string;
  time?: string;
  body?: string;
  scheduled?: WorkItemDateValue;
}

interface ParseResult {
  rows: BatchRow[];
  errors: string[];
}

const SAMPLE = `title,date,time,body
"Film kitchen update",2026-09-22,09:00,"Film the kitchen update and get B-roll."
"Edit kitchen video",2026-09-23,13:30,"## Edit notes

- Before footage
- Lighting comparison
- Final reveal"`;

export class BatchTaskImportModal extends Modal {
  private csv = "";
  private preview?: ParseResult;
  private importing = false;

  constructor(app: App, private readonly options: BatchTaskImportModalOptions) {
    super(app);
  }

  onOpen(): void {
    this.renderInput();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderInput(): void {
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-batch-import-modal");
    this.contentEl.createEl("h2", { text: "Batch load tasks" });
    this.contentEl.createEl("p", {
      text: "Paste CSV with title, date, time, and body columns. Only title is required. Quoted body fields may contain Markdown and multiple lines."
    });
    this.contentEl.createEl("pre", { text: SAMPLE, cls: "onprogram-batch-import-example" });

    new Setting(this.contentEl)
      .setName("CSV")
      .setDesc("Dates use YYYY-MM-DD. Times use 24-hour H:mm or HH:mm.")
      .addTextArea((area) => {
        area.setPlaceholder(SAMPLE).setValue(this.csv).onChange((value: string) => {
          this.csv = value;
        });
        area.inputEl.addClass("onprogram-batch-import-textarea");
        window.setTimeout(() => area.inputEl.focus(), 0);
      });

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Preview import").setCta().onClick(() => this.showPreview()))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  private showPreview(): void {
    try {
      this.preview = parseBatchCsv(this.csv);
      this.renderPreview();
    } catch (error) {
      this.options.onError(error);
    }
  }

  private renderPreview(): void {
    const preview = this.preview;
    if (!preview) return;

    this.contentEl.empty();
    this.contentEl.addClass("onprogram-batch-import-modal");
    this.contentEl.createEl("h2", { text: "Preview batch import" });
    this.contentEl.createEl("p", {
      text: `${preview.rows.length} task${preview.rows.length === 1 ? "" : "s"} ready${preview.errors.length ? `; ${preview.errors.length} issue${preview.errors.length === 1 ? "" : "s"}` : ""}.`
    });

    if (preview.errors.length > 0) {
      const errors = this.contentEl.createDiv({ cls: "onprogram-batch-import-errors" });
      for (const message of preview.errors) errors.createDiv({ text: message });
    }

    const list = this.contentEl.createDiv({ cls: "onprogram-batch-import-list" });
    for (const row of preview.rows) {
      const item = list.createDiv({ cls: "onprogram-batch-import-item" });
      item.createEl("strong", { text: row.title });
      const meta = [row.date, row.time, row.body ? `${row.body.length} body chars` : undefined]
        .filter((value): value is string => Boolean(value));
      item.createDiv({ text: meta.join(" | ") || "Unscheduled | no body", cls: "onprogram-batch-import-meta" });
    }

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => this.renderInput()))
      .addButton((button) => button
        .setButtonText(`Import ${preview.rows.length} task${preview.rows.length === 1 ? "" : "s"}`)
        .setCta()
        .setDisabled(preview.errors.length > 0 || preview.rows.length === 0 || this.importing)
        .onClick(() => void this.importRows()));
  }

  private async importRows(): Promise<void> {
    const preview = this.preview;
    if (!preview || this.importing || preview.errors.length > 0 || preview.rows.length === 0) return;

    this.importing = true;
    this.renderPreview();
    let created = 0;

    try {
      for (const row of preview.rows) {
        await this.options.taskCreator.createTask({
          title: row.title,
          targetFolder: this.options.targetFolder,
          initialDate: row.scheduled ? { field: "scheduled", value: row.scheduled } : undefined,
          body: row.body,
          openAfterCreate: false
        });
        created += 1;
      }
      new Notice(`OnProgram: Imported ${created} task${created === 1 ? "" : "s"}.`);
      this.close();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown task creation error.";
      this.options.onError(new OnProgramError(
        `Batch import stopped after ${created} task${created === 1 ? "" : "s"}. ${reason}`,
        "batch-task-import-failed"
      ));
      this.importing = false;
      this.renderPreview();
    }
  }
}

function parseBatchCsv(input: string): ParseResult {
  const table = parseCsv(input);
  if (table.length === 0) return { rows: [], errors: ["Paste CSV before previewing."] };

  const headers = (table[0] ?? []).map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const errors: string[] = [];
  if (!headers.includes("title")) errors.push("Header row must include a title column.");
  if (new Set(headers).size !== headers.length) errors.push("Header row contains duplicate columns.");

  const rows: BatchRow[] = [];
  for (let index = 1; index < table.length; index += 1) {
    const values = table[index];
    if (!values || values.every((value) => value.trim() === "")) continue;
    const rowNumber = index + 1;
    const get = (name: string): string => {
      const column = headers.indexOf(name);
      return column < 0 ? "" : values[column] ?? "";
    };

    const title = get("title").trim();
    const date = get("date").trim();
    const rawTime = get("time").trim();
    const body = get("body");
    const time = normalizeTime(rawTime);
    let invalid = false;

    if (!title) { errors.push(`Row ${rowNumber}: title is required.`); invalid = true; }
    if (date && !validDate(date)) { errors.push(`Row ${rowNumber}: date must be a real YYYY-MM-DD date.`); invalid = true; }
    if (rawTime && !time) { errors.push(`Row ${rowNumber}: time must use H:mm or HH:mm.`); invalid = true; }
    if (rawTime && !date) { errors.push(`Row ${rowNumber}: time requires a date.`); invalid = true; }
    if (values.length > headers.length) { errors.push(`Row ${rowNumber}: too many columns; quote fields containing commas.`); invalid = true; }
    if (invalid) continue;

    rows.push({
      rowNumber,
      title,
      date: date || undefined,
      time,
      body: body || undefined,
      scheduled: date ? { kind: time ? "date-time" : "date", iso: time ? `${date}T${time}` : date } : undefined
    });
  }

  return { rows, errors };
}

function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  if (!text.trim()) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === undefined) continue;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }

  if (quoted) throw new OnProgramError("CSV contains an unterminated quoted field.", "batch-task-csv-invalid");
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function normalizeTime(value: string): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hoursText = match?.[1];
  const minutesText = match?.[2];
  if (!hoursText || !minutesText) return undefined;
  const hours = Number.parseInt(hoursText, 10);
  const minutes = Number.parseInt(minutesText, 10);
  if (hours > 23 || minutes > 59) return undefined;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  if (!yearText || !monthText || !dayText) return false;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
