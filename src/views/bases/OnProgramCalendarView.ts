import { BasesView, Notice, type QueryController } from "obsidian";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
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

const CALENDAR_HOUR_HEIGHT = 64;
const CALENDAR_RESIZE_SNAP_MINUTES = 30;
const DEFAULT_TIMED_DURATION_MINUTES = 60;
const MAX_TIMED_DURATION_MINUTES = 14 * 24 * 60;

interface TimedCalendarSegment {
  item: WorkItem;
  dayIso: string;
  startMinute: number;
  durationMinutes: number;
  isStart: boolean;
  isEnd: boolean;
}

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
    private readonly workItemOpener: WorkItemOpener,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.syncViewConfig();
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-calendar-view");
    this.injectTimedCalendarStyles();

    const result = this.adapter.adapt(this.data);
    this.renderToolbar(result.items);
    this.renderUnscheduled(result.items);

    if (this.mode === "month") this.renderMonth(result.items);
    else if (this.mode === "week") this.renderWeek(result.items);
    else this.renderDay(result.items);
  }

  private syncViewConfig(): void {
    try {
      const mode = this.config.get("calendarMode");
      if (mode === "month" || mode === "week" || mode === "day") {
        this.mode = mode;
      }

      const field = this.config.get("calendarField");
      if (field === "scheduled" || field === "due" || field === "start") {
        this.field = field;
      }
    } catch {
      // Bases can instantiate a custom view before its config is fully attached.
      // Default state remains usable and a later render will synchronize it.
    }
  }

  private persistViewOption(key: string, value: string): void {
    try {
      this.config.set(key, value);
    } catch {
      // Never let view-option persistence prevent the Calendar from rendering.
    }
  }

  private injectTimedCalendarStyles(): void {
    const style = this.hostEl.createEl("style");
    style.textContent = TIMED_CALENDAR_STYLES;
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
      this.persistViewOption("calendarField", this.field);
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
        this.persistViewOption("calendarMode", mode);
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
      if (date.getMonth() !== this.anchorDate.getMonth()) {
        cell.addClass("onprogram-calendar-outside-month");
      }
      if (sameCalendarDay(date, today)) cell.addClass("onprogram-calendar-today");
      cell.setAttr("title", `Double-click empty space to create a task on ${iso}`);

      const cellHeader = cell.createDiv({ cls: "onprogram-calendar-day-header" });
      cellHeader.createSpan({ text: String(date.getDate()) });
      const add = cellHeader.createEl("button", { text: "+", cls: "onprogram-calendar-add" });
      add.setAttr("aria-label", `Create task on ${iso}`);
      add.addEventListener("click", () => this.createTaskAt({ kind: "date", iso }));

      this.makeDropTarget(cell, iso);
      this.attachEmptyDoubleClick(cell, () => this.createTaskAt({ kind: "date", iso }));
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
    const timedByDay = new Map<string, TimedCalendarSegment[]>();

    for (let day = 0; day < 7; day += 1) {
      const date = addDays(weekStart, day);
      days.push(date);
      const iso = localDateIso(date);
      timedByDay.set(iso, buildTimedSegmentsForDay(items, this.field, iso));

      const header = calendar.createDiv({ cls: "onprogram-calendar-week-day-header" });
      header.createDiv({ text: date.toLocaleDateString(undefined, { weekday: "short" }) });
      header.createEl("strong", { text: String(date.getDate()) });
      if (sameCalendarDay(date, new Date())) header.addClass("onprogram-calendar-today");
    }

    calendar.createDiv({ text: "All day", cls: "onprogram-calendar-time-label" });
    for (const date of days) {
      const iso = localDateIso(date);
      const cell = calendar.createDiv({
        cls: "onprogram-calendar-week-cell onprogram-calendar-all-day"
      });
      cell.setAttr("title", `Double-click empty space to create a task on ${iso}`);
      this.makeDropTarget(cell, iso);
      this.attachEmptyDoubleClick(cell, () => this.createTaskAt({ kind: "date", iso }));

      const dayItems = items.filter((item) => {
        const value = getCalendarDate(item, this.field);
        return value?.kind === "date" && datePart(value) === iso;
      });
      for (const item of dayItems) cell.appendChild(this.makeItemChip(item));
    }

    for (let hour = 0; hour < 24; hour += 1) {
      calendar.createDiv({ text: formatHour(hour), cls: "onprogram-calendar-time-label" });

      for (const date of days) {
        const iso = localDateIso(date);
        const cell = calendar.createDiv({ cls: "onprogram-calendar-week-cell" });
        cell.dataset.hour = String(hour);
        cell.setAttr(
          "title",
          `Double-click upper/lower half to create at ${formatHour(hour)} or :30`
        );
        this.makeDropTarget(cell, iso, hour);
        this.attachEmptyDoubleClick(cell, (event) => {
          const minute = minuteFromPointer(cell, event);
          this.createTaskAt(moveDateToDateTime(iso, hour, minute));
        });

        const segments = timedByDay.get(iso) ?? [];
        for (const segment of segments) {
          if (Math.floor(segment.startMinute / 60) !== hour) continue;
          cell.appendChild(this.makeTimedItemBlock(segment, CALENDAR_HOUR_HEIGHT));
        }
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
    this.attachEmptyDoubleClick(allDayTray, () => this.createTaskAt({ kind: "date", iso }));
    for (const item of allDayItems) allDayTray.appendChild(this.makeItemChip(item));
    const add = allDay.createEl("button", { text: "+ Add task" });
    add.addEventListener("click", () => this.createTaskAt({ kind: "date", iso }));

    const timedSegments = buildTimedSegmentsForDay(items, this.field, iso);
    const hours = calendar.createDiv({ cls: "onprogram-calendar-day-hours" });
    const now = new Date();

    for (let hour = 0; hour < 24; hour += 1) {
      const row = hours.createDiv({ cls: "onprogram-calendar-day-hour" });
      row.createDiv({ text: formatHour(hour), cls: "onprogram-calendar-time-label" });
      const slot = row.createDiv({ cls: "onprogram-calendar-day-slot" });
      if (sameCalendarDay(this.anchorDate, now) && now.getHours() === hour) {
        slot.addClass("onprogram-calendar-current-hour");
      }
      slot.setAttr(
        "title",
        `Double-click upper/lower half to create at ${formatHour(hour)} or :30`
      );
      this.makeDropTarget(slot, iso, hour);
      this.attachEmptyDoubleClick(slot, (event) => {
        const minute = minuteFromPointer(slot, event);
        this.createTaskAt(moveDateToDateTime(iso, hour, minute));
      });

      for (const segment of timedSegments) {
        if (Math.floor(segment.startMinute / 60) !== hour) continue;
        slot.appendChild(this.makeTimedItemBlock(segment, CALENDAR_HOUR_HEIGHT));
      }
    }
  }

  private makeTimedItemBlock(
    segment: TimedCalendarSegment,
    pixelsPerHour: number
  ): HTMLElement {
    const { item } = segment;
    const block = this.hostEl.doc.createElement("div");
    block.addClass("onprogram-calendar-item", "onprogram-calendar-timed-item");
    if (!segment.isStart) block.addClass("onprogram-calendar-timed-continuation");
    block.draggable = true;
    block.dataset.path = item.source.path;
    block.setAttr("title", "Drag to move. Drag the bottom edge to change duration. Double-click to open.");

    const offsetWithinHour = segment.startMinute % 60;
    const top = (offsetWithinHour / 60) * pixelsPerHour;
    const height = Math.max(24, (segment.durationMinutes / 60) * pixelsPerHour - 2);
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;

    block.createSpan({
      text: formatMinuteOfDay(segment.startMinute),
      cls: "onprogram-calendar-item-time onprogram-calendar-timed-time"
    });

    block.createEl("button", {
      text: item.title,
      cls: "onprogram-calendar-item-title onprogram-calendar-timed-title"
    });

    block.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.openItem(item);
    });

    this.attachItemDrag(block, item);

    if (segment.isEnd) {
      const handle = block.createDiv({ cls: "onprogram-calendar-resize-handle" });
      handle.setAttr("title", "Drag to change duration in 30-minute increments");
      handle.addEventListener("pointerdown", (event) => {
        this.startResize(item, block, handle, event, pixelsPerHour);
      });
    }

    return block;
  }

  private makeItemChip(item: WorkItem): HTMLElement {
    const chip = this.hostEl.doc.createElement("div");
    chip.addClass("onprogram-calendar-item");
    chip.draggable = true;
    chip.dataset.path = item.source.path;
    chip.setAttr("title", "Double-click to open this task");

    const value = getCalendarDate(item, this.field);
    const time = value ? timePart(value) : undefined;
    if (time) chip.createSpan({ text: time, cls: "onprogram-calendar-item-time" });

    chip.createEl("button", { text: item.title, cls: "onprogram-calendar-item-title" });
    chip.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      this.openItem(item);
    });

    if (item.priority === "urgent" || item.priority === "high") {
      chip.createSpan({
        text: item.durationMinutes ? `${item.priority} · ${item.durationMinutes}m` : item.priority,
        cls: "onprogram-calendar-item-meta"
      });
    }

    this.attachItemDrag(chip, item);
    return chip;
  }

  private attachItemDrag(element: HTMLElement, item: WorkItem): void {
    element.addEventListener("dragstart", (event) => {
      this.draggedPath = item.source.path;
      element.addClass("onprogram-calendar-item-dragging");
      event.dataTransfer?.setData("text/plain", item.source.path);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });

    element.addEventListener("dragend", () => {
      this.draggedPath = undefined;
      element.removeClass("onprogram-calendar-item-dragging");
      this.hostEl.querySelectorAll(".onprogram-calendar-drop-target")
        .forEach((candidate) => candidate.removeClass("onprogram-calendar-drop-target"));
    });
  }

  private startResize(
    item: WorkItem,
    block: HTMLElement,
    handle: HTMLElement,
    event: PointerEvent,
    pixelsPerHour: number
  ): void {
    if (this.writing) return;

    event.preventDefault();
    event.stopPropagation();

    const win = this.hostEl.ownerDocument.defaultView;
    if (!win) return;

    block.draggable = false;
    block.addClass("onprogram-calendar-item-resizing");

    const startY = event.clientY;
    const initialDuration = item.durationMinutes ?? DEFAULT_TIMED_DURATION_MINUTES;
    const initialHeight = block.getBoundingClientRect().height;
    let nextDuration = initialDuration;

    const preview = block.createSpan({
      text: formatDuration(initialDuration),
      cls: "onprogram-calendar-resize-preview"
    });

    const onMove = (moveEvent: PointerEvent): void => {
      const deltaPixels = moveEvent.clientY - startY;
      const deltaMinutes = (deltaPixels / pixelsPerHour) * 60;
      const snappedDelta = Math.round(deltaMinutes / CALENDAR_RESIZE_SNAP_MINUTES) *
        CALENDAR_RESIZE_SNAP_MINUTES;

      nextDuration = clamp(
        initialDuration + snappedDelta,
        CALENDAR_RESIZE_SNAP_MINUTES,
        MAX_TIMED_DURATION_MINUTES
      );

      const visualDelta = ((nextDuration - initialDuration) / 60) * pixelsPerHour;
      block.style.height = `${Math.max(24, initialHeight + visualDelta)}px`;
      preview.setText(formatDuration(nextDuration));
    };

    const onUp = (): void => {
      win.removeEventListener("pointermove", onMove);
      win.removeEventListener("pointerup", onUp);
      block.draggable = true;
      block.removeClass("onprogram-calendar-item-resizing");
      handle.blur();
      preview.remove();

      if (nextDuration !== initialDuration) {
        void this.commitDurationResize(item, nextDuration);
      } else {
        this.render();
      }
    };

    win.addEventListener("pointermove", onMove);
    win.addEventListener("pointerup", onUp, { once: true });
  }

  private async commitDurationResize(item: WorkItem, durationMinutes: number): Promise<void> {
    if (this.writing) return;

    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, { durationMinutes });
      new Notice(`OnProgram: ${item.title} now spans ${formatDuration(durationMinutes)}.`);
    } catch (error) {
      this.errorHandler.handle(error, "resize calendar item", true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }

  private attachEmptyDoubleClick(
    element: HTMLElement,
    action: (event: MouseEvent) => void
  ): void {
    element.addEventListener("dblclick", (event) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          ".onprogram-calendar-item, .onprogram-calendar-resize-handle, button, select"
        )
      ) {
        return;
      }
      event.preventDefault();
      action(event);
    });
  }

  private makeDropTarget(element: HTMLElement, dayIso: string, hour?: number): void {
    element.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (this.draggedPath) element.addClass("onprogram-calendar-drop-target");
    });

    element.addEventListener("dragleave", () => {
      element.removeClass("onprogram-calendar-drop-target");
    });

    element.addEventListener("drop", (event) => {
      event.preventDefault();
      element.removeClass("onprogram-calendar-drop-target");
      const minute = hour === undefined ? undefined : minuteFromPointer(element, event);
      void this.moveDraggedItem(dayIso, hour, minute);
    });
  }

  private async moveDraggedItem(
    dayIso: string,
    hour?: number,
    minute?: number
  ): Promise<void> {
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
          minute ?? (
            existing?.kind === "date-time" ? Number(existing.iso.slice(14, 16)) : 0
          )
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
        const result = await this.taskCreator.createTask({
          title,
          targetFolder: this.getConfiguredTaskFolder(),
          initialDate: { field: this.field, value },
          openAfterCreate: false
        });
        new Notice(`OnProgram: Created ${result.title}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "create calendar task", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    try {
      const value = this.config.get("taskFolder");
      return typeof value === "string" && value.trim() ? value.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  private openItem(item: WorkItem): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
    if (entry) void this.workItemOpener.open(entry.file);
  }

  private button(parent: HTMLElement, text: string, action: () => void, label?: string): void {
    const button = parent.createEl("button", { text });
    if (label) button.setAttr("aria-label", label);
    button.addEventListener("click", action);
  }
}

function buildTimedSegmentsForDay(
  items: WorkItem[],
  field: CalendarField,
  dayIso: string
): TimedCalendarSegment[] {
  const dayStart = parseLocalDay(dayIso);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const segments: TimedCalendarSegment[] = [];

  for (const item of items) {
    const value = getCalendarDate(item, field);
    if (!value || value.kind !== "date-time") continue;

    const itemStart = parseLocalDateTime(value.iso);
    if (!itemStart) continue;

    const durationMinutes = item.durationMinutes ?? DEFAULT_TIMED_DURATION_MINUTES;
    const itemEnd = new Date(itemStart.getTime() + durationMinutes * 60 * 1000);

    const segmentStartMs = Math.max(itemStart.getTime(), dayStart.getTime());
    const segmentEndMs = Math.min(itemEnd.getTime(), dayEnd.getTime());
    if (segmentEndMs <= segmentStartMs) continue;

    const startMinute = Math.round((segmentStartMs - dayStart.getTime()) / 60000);
    const segmentDuration = Math.round((segmentEndMs - segmentStartMs) / 60000);

    segments.push({
      item,
      dayIso,
      startMinute,
      durationMinutes: Math.max(1, segmentDuration),
      isStart: segmentStartMs === itemStart.getTime(),
      isEnd: segmentEndMs === itemEnd.getTime()
    });
  }

  return segments.sort((a, b) => {
    if (a.startMinute !== b.startMinute) return a.startMinute - b.startMinute;
    return a.item.title.localeCompare(b.item.title);
  });
}

function parseLocalDay(iso: string): Date {
  const [yearText, monthText, dayText] = iso.split("-");
  return new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
}

function parseLocalDateTime(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return undefined;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return undefined;
  }

  return new Date(year, month - 1, day, hour, minute);
}

function minuteFromPointer(element: HTMLElement, event: MouseEvent | DragEvent): number {
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  const ratio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  return ratio >= 0.5 ? 30 : 0;
}

function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, " ");
}

function formatHour(hour: number): string {
  const date = new Date(2000, 0, 1, hour);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const remainderAfterDays = minutes % 1440;
  const hours = Math.floor(remainderAfterDays / 60);
  const mins = remainderAfterDays % 60;
  const parts: string[] = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (mins || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const TIMED_CALENDAR_STYLES = `
.onprogram-calendar-week-cell,
.onprogram-calendar-day-slot {
  position: relative;
  overflow: visible;
}

.onprogram-calendar-week-cell:not(.onprogram-calendar-all-day),
.onprogram-calendar-day-slot {
  min-height: ${CALENDAR_HOUR_HEIGHT}px;
  padding: 0;
}

.onprogram-calendar-week-cell:not(.onprogram-calendar-all-day)::after,
.onprogram-calendar-day-slot::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 1px dashed var(--background-modifier-border);
  opacity: 0.72;
  pointer-events: none;
  z-index: 0;
}

.onprogram-calendar-timed-item {
  position: absolute;
  left: 4px;
  right: 4px;
  z-index: 4;
  margin: 0;
  padding: 6px 8px;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--background-secondary);
  border-color: var(--interactive-accent);
  box-shadow: var(--shadow-s);
}

.onprogram-calendar-timed-item:hover {
  z-index: 6;
  border-color: var(--interactive-accent-hover);
}

.onprogram-calendar-timed-time {
  position: absolute;
  left: 8px;
  top: 6px;
  z-index: 2;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.onprogram-calendar-timed-title {
  width: 100%;
  max-width: none;
  padding: 0 58px;
  text-align: center;
  font-weight: var(--font-semibold);
  line-height: 1.35;
}

.onprogram-calendar-timed-continuation {
  border-top-style: dashed;
}

.onprogram-calendar-resize-handle {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 0;
  height: 9px;
  cursor: ns-resize;
  z-index: 8;
}

.onprogram-calendar-resize-handle::after {
  content: "";
  position: absolute;
  left: 35%;
  right: 35%;
  bottom: 2px;
  border-top: 2px solid var(--text-faint);
  border-radius: 999px;
}

.onprogram-calendar-resize-handle:hover::after,
.onprogram-calendar-item-resizing .onprogram-calendar-resize-handle::after {
  border-color: var(--interactive-accent);
}

.onprogram-calendar-item-resizing {
  cursor: ns-resize;
  opacity: 0.92;
  z-index: 10;
}

.onprogram-calendar-resize-preview {
  position: absolute;
  right: 6px;
  bottom: 7px;
  padding: 1px 5px;
  border-radius: var(--radius-s);
  background: var(--background-primary-alt);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  pointer-events: none;
}
`;
