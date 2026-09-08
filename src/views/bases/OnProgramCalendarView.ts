import { BasesView, Notice, type QueryController } from "obsidian";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";
import {
  addDays,
  calendarPatch,
  calendarTitle,
  datePart,
  getCalendarDate,
  localDateIso,
  moveDateToDateTime,
  moveDateToDay,
  navigateCalendar,
  sameCalendarDay,
  startOfMonthGrid,
  startOfWeek,
  timePart,
  type CalendarField,
  type CalendarMode
} from "../calendar/CalendarDateUtils";

export const ONPROGRAM_CALENDAR_VIEW_ID = "onprogram-calendar";

export class OnProgramCalendarView extends BasesView {
  type = ONPROGRAM_CALENDAR_VIEW_ID;
  private mode: CalendarMode = "month";
  private field: CalendarField = "scheduled";
  private anchorDate = new Date();
  private draggedPath?: string;
  private writing = false;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly writer: WorkItemWriter,
    private readonly taskCreator: TaskCreator,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-calendar-view");

    const result = this.adapter.adapt(this.data);
    this.renderToolbar(result.items);
    this.renderUnscheduled(result.items);

    if (this.mode === "month") this.renderMonth(result.items);
    else if (this.mode === "week") this.renderWeek(result.items);
    else this.renderDay(result.items);
  }

  private renderToolbar(items: WorkItem[]): void {
    const toolbar = this.hostEl.createDiv({ cls: "onprogram-calendar-toolbar" });
    const nav = toolbar.createDiv({ cls: "onprogram-calendar-nav" });

    this.button(nav, "‹", () => {
      this.anchorDate = navigateCalendar(this.mode, this.anchorDate, -1);
      this.render();
    }, "Previous");
    this.button(nav, "Today", () => {
      this.anchorDate = new Date();
      this.render();
    });
    this.button(nav, "›", () => {
      this.anchorDate = navigateCalendar(this.mode, this.anchorDate, 1);
      this.render();
    }, "Next");

    toolbar.createEl("h3", {
      text: calendarTitle(this.mode, this.anchorDate),
      cls: "onprogram-calendar-title"
    });

    const controls = toolbar.createDiv({ cls: "onprogram-calendar-controls" });
    const fieldSelect = controls.createEl("select", { cls: "dropdown" });
    for (const field of ["scheduled", "due", "start"] as const) {
      const option = fieldSelect.createEl("option", { text: humanize(field), value: field });
      option.selected = field === this.field;
    }
    fieldSelect.setAttr("aria-label", "Calendar field");
    fieldSelect.addEventListener("change", () => {
      this.field = fieldSelect.value as CalendarField;
      this.render();
    });

    const modes = controls.createDiv({ cls: "onprogram-calendar-modes" });
    for (const mode of ["month", "week", "day"] as const) {
      const button = modes.createEl("button", {
        text: humanize(mode),
        cls: mode === this.mode ? "mod-cta" : ""
      });
      button.addEventListener("click", () => {
        this.mode = mode;
        this.render();
      });
    }

    controls.createSpan({ text: `${items.length} work items`, cls: "onprogram-calendar-count" });
  }

  private renderUnscheduled(items: WorkItem[]): void {
    const unscheduled = items.filter((item) => !getCalendarDate(item, this.field));
    if (unscheduled.length === 0) return;

    const section = this.hostEl.createEl("details", { cls: "onprogram-calendar-unscheduled" });
    section.createEl("summary", {
      text: `Unscheduled for ${humanize(this.field)} (${unscheduled.length})`
    });
    const tray = section.createDiv({ cls: "onprogram-calendar-unscheduled-tray" });
    for (const item of unscheduled) tray.appendChild(this.makeItemChip(item));
  }

  private renderMonth(items: WorkItem[]): void {
    const calendar = this.hostEl.createDiv({ cls: "onprogram-calendar-month" });
    for (const label of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      calendar.createDiv({ text: label, cls: "onprogram-calendar-weekday" });
    }

    const start = startOfMonthGrid(this.anchorDate);
    const today = new Date();

    for (let offset = 0; offset < 42; offset += 1) {
      const date = addDays(start, offset);
      const iso = localDateIso(date);
      const cell = calendar.createDiv({ cls: "onprogram-calendar-day-cell" });
      if (date.getMonth() !== this.anchorDate.getMonth()) cell.addClass("onprogram-calendar-outside-month");
      if (sameCalendarDay(date, today)) cell.addClass("onprogram-calendar-today");

      const cellHeader = cell.createDiv({ cls: "onprogram-calendar-day-header" });
      cellHeader.createSpan({ text: String(date.getDate()) });
      const add = cellHeader.createEl("button", { text: "+", cls: "onprogram-calendar-add" });
      add.setAttr("aria-label", `Create task on ${iso}`);
      add.addEventListener("click", () => this.createTaskAt({ kind: "date", iso }));

      this.makeDropTarget(cell, iso);
      const dayItems = items.filter((item) => {
        const value = getCalendarDate(item, this.field);
        return value ? datePart(value) === iso : false;
      });
      for (const item of dayItems) cell.appendChild(this.makeItemChip(item));
    }
  }

  private renderWeek(items: WorkItem[]): void {
    const weekStart = startOfWeek(this.anchorDate);
    const calendar = this.hostEl.createDiv({ cls: "onprogram-calendar-week" });
    calendar.createDiv({ cls: "onprogram-calendar-time-gutter" });

    const days: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(weekStart, day);
      days.push(date);
      const header = calendar.createDiv({ cls: "onprogram-calendar-week-day-header" });
      header.createDiv({ text: date.toLocaleDateString(undefined, { weekday: "short" }) });
      header.createEl("strong", { text: String(date.getDate()) });
      if (sameCalendarDay(date, new Date())) header.addClass("onprogram-calendar-today");
    }

    calendar.createDiv({ text: "All day", cls: "onprogram-calendar-time-label" });
    for (const date of days) {
      const iso = localDateIso(date);
      const cell = calendar.createDiv({ cls: "onprogram-calendar-week-cell onprogram-calendar-all-day" });
      this.makeDropTarget(cell, iso);
      const dayItems = items.filter((item) => {
        const value = getCalendarDate(item, this.field);
        return value?.kind === "date" && datePart(value) === iso;
      });
      for (const item of dayItems) cell.appendChild(this.makeItemChip(item));
      cell.addEventListener("dblclick", () => this.createTaskAt({ kind: "date", iso }));
    }

    for (let hour = 0; hour < 24; hour += 1) {
      calendar.createDiv({ text: formatHour(hour), cls: "onprogram-calendar-time-label" });
      for (const date of days) {
        const iso = localDateIso(date);
        const cell = calendar.createDiv({ cls: "onprogram-calendar-week-cell" });
        cell.dataset.hour = String(hour);
        this.makeDropTarget(cell, iso, hour);
        cell.addEventListener("dblclick", () => this.createTaskAt(moveDateToDateTime(iso, hour)));

        const hourItems = items.filter((item) => {
          const value = getCalendarDate(item, this.field);
          if (!value || value.kind !== "date-time" || datePart(value) !== iso) return false;
          return Number(value.iso.slice(11, 13)) === hour;
        });
        for (const item of hourItems) cell.appendChild(this.makeItemChip(item));
      }
    }
  }

  private renderDay(items: WorkItem[]): void {
    const iso = localDateIso(this.anchorDate);
    const calendar = this.hostEl.createDiv({ cls: "onprogram-calendar-day" });

    const allDay = calendar.createDiv({ cls: "onprogram-calendar-day-all-day" });
    allDay.createEl("strong", { text: "All day" });
    const allDayItems = items.filter((item) => {
      const value = getCalendarDate(item, this.field);
      return value?.kind === "date" && datePart(value) === iso;
    });
    const allDayTray = allDay.createDiv({ cls: "onprogram-calendar-day-all-day-items" });
    this.makeDropTarget(allDayTray, iso);
    for (const item of allDayItems) allDayTray.appendChild(this.makeItemChip(item));
    const add = allDay.createEl("button", { text: "+ Add task" });
    add.addEventListener("click", () => this.createTaskAt({ kind: "date", iso }));

    const hours = calendar.createDiv({ cls: "onprogram-calendar-day-hours" });
    const now = new Date();
    for (let hour = 0; hour < 24; hour += 1) {
      const row = hours.createDiv({ cls: "onprogram-calendar-day-hour" });
      row.createDiv({ text: formatHour(hour), cls: "onprogram-calendar-time-label" });
      const slot = row.createDiv({ cls: "onprogram-calendar-day-slot" });
      if (sameCalendarDay(this.anchorDate, now) && now.getHours() === hour) {
        slot.addClass("onprogram-calendar-current-hour");
      }
      this.makeDropTarget(slot, iso, hour);
      slot.addEventListener("dblclick", () => this.createTaskAt(moveDateToDateTime(iso, hour)));

      const hourItems = items.filter((item) => {
        const value = getCalendarDate(item, this.field);
        if (!value || value.kind !== "date-time" || datePart(value) !== iso) return false;
        return Number(value.iso.slice(11, 13)) === hour;
      });
      for (const item of hourItems) slot.appendChild(this.makeItemChip(item, true));
    }
  }

  private makeItemChip(item: WorkItem, detailed = false): HTMLElement {
    const chip = this.hostEl.doc.createElement("div");
    chip.addClass("onprogram-calendar-item");
    chip.draggable = true;
    chip.dataset.path = item.source.path;

    const value = getCalendarDate(item, this.field);
    const time = value ? timePart(value) : undefined;
    if (time) chip.createSpan({ text: time, cls: "onprogram-calendar-item-time" });

    const title = chip.createEl("button", { text: item.title, cls: "onprogram-calendar-item-title" });
    title.addEventListener("click", () => this.openItem(item));

    if (detailed || item.priority === "urgent" || item.priority === "high") {
      chip.createSpan({
        text: item.durationMinutes ? `${item.priority} · ${item.durationMinutes}m` : item.priority,
        cls: "onprogram-calendar-item-meta"
      });
    }

    chip.addEventListener("dragstart", (event) => {
      this.draggedPath = item.source.path;
      chip.addClass("onprogram-calendar-item-dragging");
      event.dataTransfer?.setData("text/plain", item.source.path);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    chip.addEventListener("dragend", () => {
      this.draggedPath = undefined;
      chip.removeClass("onprogram-calendar-item-dragging");
      this.hostEl.querySelectorAll(".onprogram-calendar-drop-target")
        .forEach((element) => element.removeClass("onprogram-calendar-drop-target"));
    });

    return chip;
  }

  private makeDropTarget(element: HTMLElement, dayIso: string, hour?: number): void {
    element.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (this.draggedPath) element.addClass("onprogram-calendar-drop-target");
    });
    element.addEventListener("dragleave", () => element.removeClass("onprogram-calendar-drop-target"));
    element.addEventListener("drop", (event) => {
      event.preventDefault();
      element.removeClass("onprogram-calendar-drop-target");
      void this.moveDraggedItem(dayIso, hour);
    });
  }

  private async moveDraggedItem(dayIso: string, hour?: number): Promise<void> {
    if (this.writing || !this.draggedPath) return;
    const result = this.adapter.adapt(this.data);
    const item = result.items.find((candidate) => candidate.source.path === this.draggedPath);
    if (!item) return;

    const existing = getCalendarDate(item, this.field);
    const value = hour === undefined
      ? moveDateToDay(existing, dayIso)
      : moveDateToDateTime(
          dayIso,
          hour,
          existing?.kind === "date-time" ? Number(existing.iso.slice(14, 16)) : 0
        );

    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, calendarPatch(this.field, value));
      new Notice(`OnProgram: moved ${item.title} to ${value.iso}.`);
    } catch (error) {
      this.errorHandler.handle(error, "move calendar item", true);
    } finally {
      this.writing = false;
      this.draggedPath = undefined;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }

  private createTaskAt(value: { kind: "date" | "date-time"; iso: string }): void {
    new CreateTaskModal(this.app, {
      onSubmit: async (title) => {
        await this.taskCreator.createTask({
          title,
          targetFolder: this.getConfiguredTaskFolder(),
          initialDate: { field: this.field, value }
        });
      },
      onError: (error) => this.errorHandler.handle(error, "create calendar task", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private openItem(item: WorkItem): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
    if (entry) void this.app.workspace.getLeaf(false).openFile(entry.file);
  }

  private button(parent: HTMLElement, text: string, action: () => void, label?: string): void {
    const button = parent.createEl("button", { text });
    if (label) button.setAttr("aria-label", label);
    button.addEventListener("click", action);
  }
}

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");
}

function formatHour(hour: number): string {
  const date = new Date(2000, 0, 1, hour);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}
