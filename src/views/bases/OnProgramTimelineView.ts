import { BasesView, Notice, type QueryController } from "obsidian";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemWritePatch } from "../../services/work-items/WorkItemWritePatch";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import { localDateIso, parseLocalDate } from "../calendar/CalendarDateUtils";
import {
  TIMELINE_PIXELS_PER_DAY,
  daysBetween,
  getTimelinePlacement,
  preserveDateKind,
  shiftIsoDate,
  timelineBounds,
  timelineTickDates,
  timelineTickLabel,
  type TimelinePlacement,
  type TimelineZoom
} from "../timeline/TimelineDateUtils";

export const ONPROGRAM_TIMELINE_VIEW_ID = "onprogram-timeline";

export class OnProgramTimelineView extends BasesView {
  type = ONPROGRAM_TIMELINE_VIEW_ID;
  private zoom: TimelineZoom = "week";
  private writing = false;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly writer: WorkItemWriter,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-timeline-view");

    const result = this.adapter.adapt(this.data);
    const placements = result.items
      .map((item) => getTimelinePlacement(item))
      .filter((placement): placement is TimelinePlacement => placement !== undefined);
    const unscheduled = result.items.filter((item) => !getTimelinePlacement(item));

    this.renderToolbar(placements, unscheduled.length);
    this.renderUnscheduled(unscheduled);
    this.renderTimeline(placements);
  }

  private renderToolbar(placements: TimelinePlacement[], unscheduledCount: number): void {
    const toolbar = this.hostEl.createDiv({ cls: "onprogram-timeline-toolbar" });
    toolbar.createEl("h3", { text: "OnProgram Timeline" });

    const summary = toolbar.createDiv({ cls: "onprogram-timeline-summary" });
    summary.createSpan({ text: `${placements.length} scheduled` });
    if (unscheduledCount > 0) summary.createSpan({ text: `${unscheduledCount} unscheduled` });

    const zoom = toolbar.createDiv({ cls: "onprogram-timeline-zoom" });
    for (const value of ["day", "week", "month", "quarter"] as const) {
      const button = zoom.createEl("button", {
        text: humanize(value),
        cls: value === this.zoom ? "mod-cta" : ""
      });
      button.addEventListener("click", () => {
        this.zoom = value;
        this.render();
      });
    }
  }

  private renderUnscheduled(items: WorkItem[]): void {
    if (items.length === 0) return;

    const details = this.hostEl.createEl("details", { cls: "onprogram-timeline-unscheduled" });
    details.createEl("summary", { text: `No timeline date (${items.length})` });
    const list = details.createDiv({ cls: "onprogram-timeline-unscheduled-list" });
    for (const item of items) {
      const button = list.createEl("button", { text: item.title });
      button.addEventListener("click", () => this.openItem(item));
    }
  }

  private renderTimeline(placements: TimelinePlacement[]): void {
    const bounds = timelineBounds(placements);
    const pixelsPerDay = TIMELINE_PIXELS_PER_DAY[this.zoom];
    const totalDays = Math.max(1, daysBetween(bounds.start, bounds.end) + 1);
    const timelineWidth = Math.max(900, totalDays * pixelsPerDay);

    const shell = this.hostEl.createDiv({ cls: "onprogram-timeline-shell" });
    const labels = shell.createDiv({ cls: "onprogram-timeline-labels" });
    const scroll = shell.createDiv({ cls: "onprogram-timeline-scroll" });
    const canvas = scroll.createDiv({ cls: "onprogram-timeline-canvas" });
    canvas.setCssStyles({ width: `${timelineWidth}px` });

    this.renderTicks(canvas, bounds.start, bounds.end, pixelsPerDay);
    this.renderToday(canvas, bounds.start, pixelsPerDay, timelineWidth);

    const groups = groupPlacements(placements);
    let rowIndex = 0;

    for (const [groupName, groupPlacements] of groups) {
      labels.createDiv({ text: groupName, cls: "onprogram-timeline-group-label" });
      const groupRow = canvas.createDiv({ cls: "onprogram-timeline-group-row" });
      groupRow.setCssStyles({ top: `${rowIndex * 42}px` });
      rowIndex += 1;

      for (const placement of groupPlacements) {
        labels.appendChild(this.makeLabel(placement.item));
        const row = canvas.createDiv({ cls: "onprogram-timeline-row" });
        row.setCssStyles({ top: `${rowIndex * 42}px` });
        this.renderPlacement(row, placement, bounds.start, pixelsPerDay);
        rowIndex += 1;
      }
    }

    if (groups.size === 0) {
      labels.createDiv({ text: "No dated work items", cls: "onprogram-timeline-empty" });
    }

    const height = Math.max(160, rowIndex * 42 + 42);
    canvas.setCssStyles({ height: `${height}px` });
    labels.setCssStyles({ minHeight: `${height}px` });

    // Align label rows with the scrollable timeline header.
    labels.createDiv({ cls: "onprogram-timeline-label-bottom-spacer" });
  }

  private renderTicks(canvas: HTMLElement, start: Date, end: Date, pixelsPerDay: number): void {
    const header = canvas.createDiv({ cls: "onprogram-timeline-axis" });
    for (const tick of timelineTickDates(start, end, this.zoom)) {
      const left = daysBetween(start, tick) * pixelsPerDay;
      const marker = header.createDiv({ cls: "onprogram-timeline-tick" });
      marker.setCssStyles({ left: `${left}px` });
      marker.createSpan({ text: timelineTickLabel(tick, this.zoom) });

      const gridline = canvas.createDiv({ cls: "onprogram-timeline-gridline" });
      gridline.setCssStyles({ left: `${left}px` });
    }
  }

  private renderToday(
    canvas: HTMLElement,
    start: Date,
    pixelsPerDay: number,
    timelineWidth: number
  ): void {
    const today = new Date();
    const left = daysBetween(start, today) * pixelsPerDay;
    if (left < 0 || left > timelineWidth) return;

    const marker = canvas.createDiv({ cls: "onprogram-timeline-today-marker" });
    marker.setCssStyles({ left: `${left}px` });
    marker.createSpan({ text: "Today" });
  }

  private makeLabel(item: WorkItem): HTMLElement {
    const row = this.hostEl.doc.createElement("div");
    row.addClass("onprogram-timeline-label-row");
    const button = row.createEl("button", { text: item.title });
    button.addEventListener("click", () => this.openItem(item));
    row.createSpan({ text: item.status });
    return row;
  }

  private renderPlacement(
    row: HTMLElement,
    placement: TimelinePlacement,
    timelineStart: Date,
    pixelsPerDay: number
  ): void {
    const left = daysBetween(timelineStart, parseLocalDate(placement.startIso)) * pixelsPerDay;

    if (placement.kind === "point") {
      const point = row.createDiv({ cls: "onprogram-timeline-point" });
      point.setCssStyles({ left: `${left}px` });
      point.setAttr("title", `${placement.item.title} · ${placement.startIso}`);
      point.createSpan({ text: "◆" });
      this.attachPointDrag(point, placement, pixelsPerDay);
      return;
    }

    const durationDays = Math.max(
      1,
      daysBetween(parseLocalDate(placement.startIso), parseLocalDate(placement.endIso)) + 1
    );
    const width = Math.max(18, durationDays * pixelsPerDay);
    const bar = row.createDiv({ cls: "onprogram-timeline-bar" });
    bar.setCssStyles({ left: `${left}px`, width: `${width}px` });
    bar.setAttr("title", `${placement.item.title}: ${placement.startIso} → ${placement.endIso}`);

    const leftHandle = bar.createDiv({ cls: "onprogram-timeline-resize onprogram-timeline-resize-start" });
    const label = bar.createSpan({ text: placement.item.title, cls: "onprogram-timeline-bar-label" });
    label.setAttr("aria-hidden", "true");
    const rightHandle = bar.createDiv({ cls: "onprogram-timeline-resize onprogram-timeline-resize-end" });

    this.attachRangeDrag(bar, placement, pixelsPerDay);
    this.attachResize(leftHandle, placement, "start", pixelsPerDay);
    this.attachResize(rightHandle, placement, "end", pixelsPerDay);
  }

  private attachRangeDrag(
    bar: HTMLElement,
    placement: TimelinePlacement,
    pixelsPerDay: number
  ): void {
    bar.addEventListener("pointerdown", (event) => {
      if ((event.target as HTMLElement).closest(".onprogram-timeline-resize")) return;
      if (this.writing) return;

      const startX = event.clientX;
      const originalTransform = bar.style.transform;
      bar.setPointerCapture(event.pointerId);
      bar.addClass("onprogram-timeline-dragging");

      const move = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        bar.setCssStyles({ transform: `translateX(${dx}px)` });
      };

      const finish = (upEvent: PointerEvent) => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", finish);
        bar.removeEventListener("pointercancel", cancel);
        bar.releasePointerCapture(upEvent.pointerId);
        bar.removeClass("onprogram-timeline-dragging");
        bar.setCssStyles({ transform: originalTransform });

        const delta = Math.round((upEvent.clientX - startX) / pixelsPerDay);
        if (delta !== 0) void this.shiftPlacement(placement, delta);
      };

      const cancel = (cancelEvent: PointerEvent) => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", finish);
        bar.removeEventListener("pointercancel", cancel);
        bar.releasePointerCapture(cancelEvent.pointerId);
        bar.removeClass("onprogram-timeline-dragging");
        bar.setCssStyles({ transform: originalTransform });
      };

      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", finish);
      bar.addEventListener("pointercancel", cancel);
    });
  }

  private attachPointDrag(
    point: HTMLElement,
    placement: TimelinePlacement,
    pixelsPerDay: number
  ): void {
    point.addEventListener("pointerdown", (event) => {
      if (this.writing) return;
      const startX = event.clientX;
      point.setPointerCapture(event.pointerId);
      point.addClass("onprogram-timeline-dragging");

      const move = (moveEvent: PointerEvent) => {
        point.setCssStyles({ transform: `translateX(${moveEvent.clientX - startX}px)` });
      };
      const finish = (upEvent: PointerEvent) => {
        cleanup(upEvent);
        const delta = Math.round((upEvent.clientX - startX) / pixelsPerDay);
        if (delta !== 0) void this.shiftPlacement(placement, delta);
      };
      const cancel = (cancelEvent: PointerEvent) => cleanup(cancelEvent);
      const cleanup = (endEvent: PointerEvent) => {
        point.removeEventListener("pointermove", move);
        point.removeEventListener("pointerup", finish);
        point.removeEventListener("pointercancel", cancel);
        point.releasePointerCapture(endEvent.pointerId);
        point.removeClass("onprogram-timeline-dragging");
        point.setCssStyles({ transform: "" });
      };

      point.addEventListener("pointermove", move);
      point.addEventListener("pointerup", finish);
      point.addEventListener("pointercancel", cancel);
    });
  }

  private attachResize(
    handle: HTMLElement,
    placement: TimelinePlacement,
    edge: "start" | "end",
    pixelsPerDay: number
  ): void {
    handle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (this.writing) return;

      const startX = event.clientX;
      handle.setPointerCapture(event.pointerId);
      handle.addClass("onprogram-timeline-resizing");

      const finish = (upEvent: PointerEvent) => {
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", cancel);
        handle.releasePointerCapture(upEvent.pointerId);
        handle.removeClass("onprogram-timeline-resizing");
        const delta = Math.round((upEvent.clientX - startX) / pixelsPerDay);
        if (delta !== 0) void this.resizePlacement(placement, edge, delta);
      };
      const cancel = (cancelEvent: PointerEvent) => {
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", cancel);
        handle.releasePointerCapture(cancelEvent.pointerId);
        handle.removeClass("onprogram-timeline-resizing");
      };

      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", cancel);
    });
  }

  private async shiftPlacement(placement: TimelinePlacement, deltaDays: number): Promise<void> {
    const item = placement.item;
    let patch: WorkItemWritePatch;

    if (placement.kind === "point" && placement.pointField) {
      const nextIso = shiftIsoDate(placement.startIso, deltaDays);
      patch = this.patchPoint(item, placement.pointField, nextIso);
    } else {
      const nextStart = shiftIsoDate(placement.startIso, deltaDays);
      const nextEnd = shiftIsoDate(placement.endIso, deltaDays);
      patch = this.patchRange(item, placement, nextStart, nextEnd);
    }

    await this.write(item, patch, `shift ${item.title}`);
  }

  private async resizePlacement(
    placement: TimelinePlacement,
    edge: "start" | "end",
    deltaDays: number
  ): Promise<void> {
    if (placement.kind !== "range") return;

    let nextStart = placement.startIso;
    let nextEnd = placement.endIso;
    if (edge === "start") nextStart = shiftIsoDate(nextStart, deltaDays);
    else nextEnd = shiftIsoDate(nextEnd, deltaDays);

    if (parseLocalDate(nextEnd) < parseLocalDate(nextStart)) {
      new Notice("OnProgram: timeline range cannot end before it starts.");
      return;
    }

    await this.write(
      placement.item,
      this.patchRange(placement.item, placement, nextStart, nextEnd),
      `resize ${placement.item.title}`
    );
  }

  private patchRange(
    item: WorkItem,
    placement: TimelinePlacement,
    startIso: string,
    endIso: string
  ): WorkItemWritePatch {
    const patch: WorkItemWritePatch = {
      start: preserveDateKind(item.dates.start, startIso)
    };

    if (placement.sourceEndField === "due") {
      patch.due = preserveDateKind(item.dates.due, endIso);
    } else {
      patch.end = preserveDateKind(item.dates.end, endIso);
    }
    return patch;
  }

  private patchPoint(
    item: WorkItem,
    field: "due" | "scheduled" | "start",
    iso: string
  ): WorkItemWritePatch {
    if (field === "due") return { due: preserveDateKind(item.dates.due, iso) };
    if (field === "scheduled") return { scheduled: preserveDateKind(item.dates.scheduled, iso) };
    return { start: preserveDateKind(item.dates.start, iso) };
  }

  private async write(item: WorkItem, patch: WorkItemWritePatch, context: string): Promise<void> {
    if (this.writing) return;
    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");
    try {
      await this.writer.updateItem(item, patch);
    } catch (error) {
      this.errorHandler.handle(error, `timeline ${context}`, true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }

  private openItem(item: WorkItem): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
    if (entry) void this.app.workspace.getLeaf(false).openFile(entry.file);
  }
}

function groupPlacements(placements: TimelinePlacement[]): Map<string, TimelinePlacement[]> {
  const groups = new Map<string, TimelinePlacement[]>();
  for (const placement of placements) {
    const key = placement.item.project?.trim() || "No project";
    const group = groups.get(key) ?? [];
    group.push(placement);
    groups.set(key, group);
  }

  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function humanize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
