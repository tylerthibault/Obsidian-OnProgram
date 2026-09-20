import { Modal, Notice, Setting, type App } from "obsidian";
import { OnProgramError } from "../core/ErrorHandler";
import type { WorkItemDateValue } from "../models/work-item/WorkItemDates";
import { WORK_ITEM_PRIORITIES, isWorkItemPriority, type WorkItemPriority } from "../models/work-item/WorkItemPriority";
import { WORK_ITEM_STATUSES, isWorkItemStatus, type WorkItemStatus } from "../models/work-item/WorkItemStatus";
import type { TaskCreator } from "../services/work-items/TaskCreator";

export interface BatchTaskImportModalOptions {
  taskCreator: TaskCreator;
  targetFolder?: string;
  onError: (error: unknown) => void;
}

type ImportStep = "input" | "mapping" | "preview";
type MappingTarget = "title" | "date" | "time" | "body" | "project" | "status" | "priority" | "custom" | "ignore";

interface ColumnMapping {
  header: string;
  target: MappingTarget;
  customProperty?: string;
}

interface ImportDefaults {
  project: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  destinationFolder: string;
}

interface BatchRow {
  rowNumber: number;
  title: string;
  date: string;
  time: string;
  body: string;
  project: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  customProperties: Record<string, string>;
  scheduled?: WorkItemDateValue;
  errors: string[];
}

const SAMPLE = `title,date,time,project,status,priority,body
"Film kitchen update",2026-09-22,09:00,Kitchen,todo,high,"Film the kitchen update and get B-roll."
"Edit kitchen video",2026-09-23,13:30,Kitchen,in-progress,normal,"## Edit notes

- Before footage
- Lighting comparison
- Final reveal"`;

function buildAiFormattingPrompt(defaults: ImportDefaults): string {
  const defaultProject = defaults.project.trim() || "(none)";
  const defaultFolder = defaults.destinationFolder.trim() || "(use OnProgram's normal task destination)";

  return [
    "I am planning work that I want to import into OnProgram as tasks.",
    "After this prompt, I will describe the project, plan, schedule, or work I want to do.",
    "",
    "Turn my planning information into CSV that can be pasted directly into OnProgram's Batch Load Tasks importer.",
    "",
    "OUTPUT RULES",
    "- Put the finished import data inside exactly one fenced Markdown code block labeled csv.",
    "- The csv code block is the copy/paste payload for OnProgram. Do not put any explanations, headings, notes, or other text inside that code block.",
    "- You may add a brief explanation outside the code block if useful, but the user must be able to click Copy on the csv code block and paste that content directly into OnProgram.",
    "- Do not indent CSV records. Every record must begin at the first character of the line; never add spaces before the opening quote or first field.",
    "- Do not add blank lines between CSV records. Blank lines are allowed only when they are part of a quoted multiline body field.",
    "- Use exactly this header row:",
    "title,date,time,project,status,priority,body",
    "- Create one row per actionable task.",
    "- title is required and should be concise but specific.",
    "- date is optional. When present, use YYYY-MM-DD.",
    "- time is optional. When present, use 24-hour HH:mm and only use it when date is also present.",
    `- status must be one of: ${WORK_ITEM_STATUSES.join(", ")}.`,
    `- priority must be one of: ${WORK_ITEM_PRIORITIES.join(", ")}.`,
    "- project is optional.",
    "- body is optional Markdown. Use it for useful details, notes, acceptance criteria, checklists, or subtasks.",
    "- Follow normal CSV quoting rules. Quote any field containing a comma, double quote, or line break.",
    "- Escape a double quote inside a quoted field by doubling it.",
    "- Multiline Markdown bodies are allowed, but the entire body field must stay inside CSV quotes.",
    "- Do not invent dates or times when my plan does not provide enough information. Leave those cells blank instead.",
    "",
    "CURRENT ONPROGRAM IMPORT DEFAULTS",
    `- Project: ${defaultProject}`,
    `- Status: ${defaults.status}`,
    `- Priority: ${defaults.priority}`,
    `- Destination folder: ${defaultFolder}`,
    "- When a task should use the Project, Status, or Priority default above, leave that CSV cell blank. Only provide a value when the task should override the default.",
    "",
    "EXAMPLE",
    "title,date,time,project,status,priority,body",
    "\"Film kitchen update\",2026-09-22,09:00,,,high,\"Film the kitchen update and get B-roll.\"",
    "\"Edit kitchen video\",2026-09-23,13:30,,in-progress,,\"## Edit notes",
    "",
    "- Before footage",
    "- Lighting comparison",
    "- Final reveal\"",
    "",
    "Now wait for my planning information. Put the finished OnProgram CSV in one ```csv code block so its Copy button copies only the paste-ready import data."
  ].join("\n");
}

const MAPPING_LABELS: Readonly<Record<MappingTarget, string>> = {
  title: "Title",
  date: "Scheduled date",
  time: "Scheduled time",
  body: "Markdown body",
  project: "Project",
  status: "Status",
  priority: "Priority",
  custom: "Custom frontmatter property",
  ignore: "Ignore"
};

export class BatchTaskImportModal extends Modal {
  private csv = "";
  private step: ImportStep = "input";
  private table: string[][] = [];
  private mappings: ColumnMapping[] = [];
  private rows: BatchRow[] = [];
  private importing = false;
  private defaults: ImportDefaults;

  constructor(app: App, private readonly options: BatchTaskImportModalOptions) {
    super(app);
    this.defaults = {
      project: "",
      status: "todo",
      priority: "normal",
      destinationFolder: options.targetFolder ?? ""
    };
  }

  onOpen(): void {
    this.modalEl.addClass("onprogram-batch-import-shell");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    if (this.step === "mapping") this.renderMapping();
    else if (this.step === "preview") this.renderPreview();
    else this.renderInput();
  }

  private renderInput(): void {
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-batch-import-modal");
    this.contentEl.createEl("h2", { text: "Batch load tasks" });
    this.contentEl.createEl("p", {
      text: "Paste CSV, choose defaults, map columns, edit the preview, then create normal OnProgram tasks."
    });

    const defaults = this.contentEl.createDiv({ cls: "onprogram-batch-import-defaults" });
    defaults.createEl("h3", { text: "Import defaults" });

    new Setting(defaults)
      .setName("Project")
      .setDesc("Used when a row does not provide a project.")
      .addText((text) => text.setValue(this.defaults.project).setPlaceholder("Optional project").onChange((value) => {
        this.defaults.project = value;
      }));

    new Setting(defaults)
      .setName("Status")
      .setDesc("Used when a row does not provide a status.")
      .addDropdown((dropdown) => {
        for (const status of WORK_ITEM_STATUSES) dropdown.addOption(status, status);
        dropdown.setValue(this.defaults.status).onChange((value) => {
          if (isWorkItemStatus(value)) this.defaults.status = value;
        });
      });

    new Setting(defaults)
      .setName("Priority")
      .setDesc("Used when a row does not provide a priority.")
      .addDropdown((dropdown) => {
        for (const priority of WORK_ITEM_PRIORITIES) dropdown.addOption(priority, priority);
        dropdown.setValue(this.defaults.priority).onChange((value) => {
          if (isWorkItemPriority(value)) this.defaults.priority = value;
        });
      });

    new Setting(defaults)
      .setName("Destination folder")
      .setDesc("Overrides the normal task destination for this import. Leave blank to use the normal OnProgram task destination.")
      .addText((text) => text.setValue(this.defaults.destinationFolder).setPlaceholder("Tasks").onChange((value) => {
        this.defaults.destinationFolder = value;
      }));

    this.contentEl.createEl("pre", { text: SAMPLE, cls: "onprogram-batch-import-example" });

    new Setting(this.contentEl)
      .setName("Format with AI")
      .setDesc("Copy instructions you can give an AI so its response can be pasted directly into this importer.")
      .addButton((button) => button
        .setButtonText("Copy AI prompt")
        .onClick(() => void this.copyAiPrompt()));

    new Setting(this.contentEl)
      .setName("CSV")
      .setDesc("Quoted fields may contain commas and multiple lines.")
      .addTextArea((area) => {
        area.setPlaceholder(SAMPLE).setValue(this.csv).onChange((value: string) => {
          this.csv = value;
        });
        area.inputEl.addClass("onprogram-batch-import-textarea");
      });

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Map columns").setCta().onClick(() => this.prepareMapping()))
      .addButton((button) => button.setButtonText("Cancel").onClick(() => this.close()));
  }

  private async copyAiPrompt(): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildAiFormattingPrompt(this.defaults));
      new Notice("OnProgram: AI formatting prompt copied to clipboard.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Clipboard access failed.";
      this.options.onError(new OnProgramError(
        `Could not copy the AI formatting prompt. ${reason}`,
        "batch-task-ai-prompt-copy-failed"
      ));
    }
  }

  private prepareMapping(): void {
    try {
      const table = parseCsv(this.csv);
      if (table.length < 2) throw new OnProgramError("Paste a CSV header and at least one data row.", "batch-task-csv-empty");
      const headers = table[0] ?? [];
      if (headers.length === 0) throw new OnProgramError("CSV header row is empty.", "batch-task-csv-empty-header");

      this.table = table;
      this.mappings = headers.map((header) => autoMapColumn(header));
      this.step = "mapping";
      this.render();
    } catch (error) {
      this.options.onError(error);
    }
  }

  private renderMapping(): void {
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-batch-import-modal");
    this.contentEl.createEl("h2", { text: "Map CSV columns" });
    this.contentEl.createEl("p", {
      text: "OnProgram guessed the mappings below. Change any column before building the preview. Unknown columns default to custom frontmatter."
    });

    const grid = this.contentEl.createDiv({ cls: "onprogram-batch-mapping-grid" });
    this.mappings.forEach((mapping, index) => {
      const row = grid.createDiv({ cls: "onprogram-batch-mapping-row" });
      row.createDiv({ text: mapping.header || "Unnamed column", cls: "onprogram-batch-mapping-source" });

      const select = row.createEl("select");
      const targets: MappingTarget[] = ["title", "date", "time", "body", "project", "status", "priority", "custom", "ignore"];
      for (const target of targets) {
        const option = select.createEl("option", { text: MAPPING_LABELS[target], value: target });
        if (target === mapping.target) option.selected = true;
      }
      select.addEventListener("change", () => {
        mapping.target = select.value as MappingTarget;
        if (mapping.target === "custom" && !mapping.customProperty) mapping.customProperty = normalizeHeader(mapping.header);
        this.renderMapping();
      });

      if (mapping.target === "custom") {
        const custom = row.createEl("input", { type: "text", value: mapping.customProperty ?? normalizeHeader(mapping.header) });
        custom.placeholder = "frontmatter_property";
        custom.addEventListener("input", () => {
          mapping.customProperty = custom.value;
        });
      }
    });

    const mappingErrors = validateMappings(this.mappings);
    if (mappingErrors.length > 0) {
      const errors = this.contentEl.createDiv({ cls: "onprogram-batch-import-errors" });
      for (const message of mappingErrors) errors.createDiv({ text: message });
    }

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Back").onClick(() => {
        this.step = "input";
        this.render();
      }))
      .addButton((button) => button
        .setButtonText("Build preview")
        .setCta()
        .setDisabled(mappingErrors.length > 0)
        .onClick(() => this.buildPreview()));
  }

  private buildPreview(): void {
    const mappingErrors = validateMappings(this.mappings);
    if (mappingErrors.length > 0) {
      this.options.onError(new OnProgramError(mappingErrors.join(" "), "batch-task-mapping-invalid"));
      return;
    }

    this.rows = [];
    for (let index = 1; index < this.table.length; index += 1) {
      const values = this.table[index];
      if (!values || values.every((value) => value.trim() === "")) continue;
      this.rows.push(buildRow(index + 1, values, this.mappings, this.defaults));
    }
    this.step = "preview";
    this.render();
  }

  private renderPreview(): void {
    this.revalidateRows();
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-batch-import-modal");
    this.contentEl.createEl("h2", { text: "Edit & preview import" });

    const errorCount = this.rows.reduce((total, row) => total + row.errors.length, 0);
    this.contentEl.createEl("p", {
      text: `${this.rows.length} task${this.rows.length === 1 ? "" : "s"} ready for review${errorCount ? `; ${errorCount} issue${errorCount === 1 ? "" : "s"} to fix` : ""}.`
    });

    const list = this.contentEl.createDiv({ cls: "onprogram-batch-edit-list" });
    for (const row of this.rows) this.renderEditableRow(list, row);

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Back to mapping").onClick(() => {
        this.step = "mapping";
        this.render();
      }))
      .addButton((button) => button
        .setButtonText(`Import ${this.rows.length} task${this.rows.length === 1 ? "" : "s"}`)
        .setCta()
        .setDisabled(errorCount > 0 || this.rows.length === 0 || this.importing)
        .onClick(() => void this.importRows()));
  }

  private renderEditableRow(parent: HTMLElement, row: BatchRow): void {
    const card = parent.createDiv({ cls: "onprogram-batch-edit-card" });
    if (row.errors.length > 0) card.addClass("onprogram-batch-edit-card-error");
    card.createDiv({ text: `CSV row ${row.rowNumber}`, cls: "onprogram-batch-edit-row-number" });

    const fields = card.createDiv({ cls: "onprogram-batch-edit-fields" });
    addTextField(fields, "Title", row.title, (value) => row.title = value);
    addTextField(fields, "Date", row.date, (value) => row.date = value, "YYYY-MM-DD");
    addTextField(fields, "Time", row.time, (value) => row.time = value, "HH:mm");
    addTextField(fields, "Project", row.project, (value) => row.project = value);

    const statusWrap = fields.createDiv({ cls: "onprogram-batch-edit-field" });
    statusWrap.createEl("label", { text: "Status" });
    const status = statusWrap.createEl("select");
    for (const value of WORK_ITEM_STATUSES) status.createEl("option", { text: value, value });
    status.value = row.status;
    status.addEventListener("change", () => {
      if (isWorkItemStatus(status.value)) row.status = status.value;
      this.renderPreview();
    });

    const priorityWrap = fields.createDiv({ cls: "onprogram-batch-edit-field" });
    priorityWrap.createEl("label", { text: "Priority" });
    const priority = priorityWrap.createEl("select");
    for (const value of WORK_ITEM_PRIORITIES) priority.createEl("option", { text: value, value });
    priority.value = row.priority;
    priority.addEventListener("change", () => {
      if (isWorkItemPriority(priority.value)) row.priority = priority.value;
      this.renderPreview();
    });

    const bodyWrap = card.createDiv({ cls: "onprogram-batch-edit-body" });
    bodyWrap.createEl("label", { text: "Markdown body" });
    const body = bodyWrap.createEl("textarea");
    body.value = row.body;
    body.addEventListener("input", () => row.body = body.value);

    const customEntries = Object.entries(row.customProperties);
    if (customEntries.length > 0) {
      const custom = card.createDiv({ cls: "onprogram-batch-custom-properties" });
      custom.createEl("strong", { text: "Custom properties" });
      for (const [property, value] of customEntries) {
        addTextField(custom, property, value, (next) => row.customProperties[property] = next);
      }
    }

    if (row.errors.length > 0) {
      const errors = card.createDiv({ cls: "onprogram-batch-row-errors" });
      for (const message of row.errors) errors.createDiv({ text: message });
    }

    const refresh = card.createEl("button", { text: "Validate row" });
    refresh.addEventListener("click", () => this.renderPreview());
  }

  private revalidateRows(): void {
    for (const row of this.rows) {
      row.errors = validateRow(row);
      row.scheduled = row.errors.length === 0 && row.date
        ? { kind: row.time ? "date-time" : "date", iso: row.time ? `${row.date}T${row.time}` : row.date }
        : undefined;
    }
  }

  private async importRows(): Promise<void> {
    this.revalidateRows();
    if (this.importing || this.rows.length === 0 || this.rows.some((row) => row.errors.length > 0)) return;

    this.importing = true;
    this.renderPreview();
    let created = 0;

    try {
      for (const row of this.rows) {
        const extraProperties = Object.fromEntries(
          Object.entries(row.customProperties).filter(([property]) => property.trim().length > 0)
        );

        await this.options.taskCreator.createTask({
          title: row.title,
          project: row.project || undefined,
          initialStatus: row.status,
          priority: row.priority,
          targetFolder: this.options.targetFolder,
          destinationFolderOverride: this.defaults.destinationFolder.trim() ? this.defaults.destinationFolder.trim() : undefined,
          initialDate: row.scheduled ? { field: "scheduled", value: row.scheduled } : undefined,
          body: row.body || undefined,
          extraProperties,
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

function autoMapColumn(header: string): ColumnMapping {
  const normalized = normalizeHeader(header);
  const aliases: Readonly<Record<string, MappingTarget>> = {
    title: "title",
    name: "title",
    task: "title",
    date: "date",
    scheduled_date: "date",
    schedule_date: "date",
    time: "time",
    scheduled_time: "time",
    body: "body",
    notes: "body",
    description: "body",
    content: "body",
    project: "project",
    status: "status",
    priority: "priority"
  };
  const target = aliases[normalized] ?? "custom";
  return {
    header,
    target,
    customProperty: target === "custom" ? normalized : undefined
  };
}

function validateMappings(mappings: readonly ColumnMapping[]): string[] {
  const errors: string[] = [];
  if (!mappings.some((mapping) => mapping.target === "title")) errors.push("One column must map to Title.");

  const singletonTargets: MappingTarget[] = ["title", "date", "time", "body", "project", "status", "priority"];
  for (const target of singletonTargets) {
    const count = mappings.filter((mapping) => mapping.target === target).length;
    if (count > 1) errors.push(`Only one column can map to ${MAPPING_LABELS[target]}.`);
  }

  const customNames = new Set<string>();
  for (const mapping of mappings.filter((item) => item.target === "custom")) {
    const property = mapping.customProperty?.trim() ?? "";
    if (!property) errors.push(`Custom mapping for '${mapping.header}' needs a frontmatter property name.`);
    else if (customNames.has(property)) errors.push(`Custom frontmatter property '${property}' is mapped more than once.`);
    else customNames.add(property);
  }
  return errors;
}

function buildRow(
  rowNumber: number,
  values: readonly string[],
  mappings: readonly ColumnMapping[],
  defaults: ImportDefaults
): BatchRow {
  let title = "";
  let date = "";
  let time = "";
  let body = "";
  let project = defaults.project;
  let status: WorkItemStatus = defaults.status;
  let priority: WorkItemPriority = defaults.priority;
  const customProperties: Record<string, string> = {};

  mappings.forEach((mapping, index) => {
    const raw = values[index] ?? "";
    const trimmed = raw.trim();
    switch (mapping.target) {
      case "title": title = trimmed; break;
      case "date": date = trimmed; break;
      case "time": time = trimmed; break;
      case "body": body = raw; break;
      case "project": if (trimmed) project = trimmed; break;
      case "status": if (trimmed && isWorkItemStatus(trimmed)) status = trimmed; else if (trimmed) status = trimmed as WorkItemStatus; break;
      case "priority": if (trimmed && isWorkItemPriority(trimmed)) priority = trimmed; else if (trimmed) priority = trimmed as WorkItemPriority; break;
      case "custom": {
        const property = mapping.customProperty?.trim();
        if (property && raw.length > 0) customProperties[property] = raw;
        break;
      }
      case "ignore": break;
    }
  });

  const row: BatchRow = { rowNumber, title, date, time, body, project, status, priority, customProperties, errors: [] };
  row.errors = validateRow(row);
  row.scheduled = row.errors.length === 0 && date
    ? { kind: time ? "date-time" : "date", iso: time ? `${date}T${time}` : date }
    : undefined;
  return row;
}

function validateRow(row: BatchRow): string[] {
  const errors: string[] = [];
  if (!row.title.trim()) errors.push("Title is required.");
  if (row.date && !validDate(row.date)) errors.push("Date must be a real YYYY-MM-DD date.");

  if (row.time) {
    const normalized = normalizeTime(row.time);
    if (!normalized) errors.push("Time must use H:mm or HH:mm.");
    else row.time = normalized;
    if (!row.date) errors.push("Time requires a date.");
  }

  if (!isWorkItemStatus(row.status)) errors.push(`Unknown status '${row.status}'.`);
  if (!isWorkItemPriority(row.priority)) errors.push(`Unknown priority '${row.priority}'.`);
  return errors;
}

function addTextField(
  parent: HTMLElement,
  label: string,
  value: string,
  onChange: (value: string) => void,
  placeholder = ""
): void {
  const wrap = parent.createDiv({ cls: "onprogram-batch-edit-field" });
  wrap.createEl("label", { text: label });
  const input = wrap.createEl("input", { type: "text", value });
  input.placeholder = placeholder;
  input.addEventListener("input", () => onChange(input.value));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
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
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new OnProgramError("CSV contains an unterminated quoted field.", "batch-task-csv-invalid");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

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
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
