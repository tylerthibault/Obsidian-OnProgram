import { BasesView, Notice, type QueryController } from "obsidian";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemWritePatch } from "../../services/work-items/WorkItemWritePatch";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";
import {
  getTimelinePlacement,
  isSubdayZoom,
  pixelsBetween,
  shiftedDateValue,
  snapDragMinutes,
  timelineBandSegments,
  timelineBounds,
  timelineDate,
  timelinePlacementLabel,
  timelineTickDates,
  timelineTickLabel,
  type TimelinePlacement,
  type TimelineRangeEndField,
  type TimelineRangeStartField,
  type TimelineZoom
} from "../timeline/TimelineDateUtils";
import { TIMELINE_STYLES } from "../timeline/TimelineStyles";

export const ONPROGRAM_TIMELINE_VIEW_ID = "onprogram-timeline";

const AXIS_HEIGHT = 62;
const ROW_HEIGHT = 44;

export class OnProgramTimelineView extends BasesView {
  type = ONPROGRAM_TIMELINE_VIEW_ID;
  private zoom: TimelineZoom = "week";
  private writing = false;
  private scrollEl?: HTMLElement;
  private activeBounds?: { start: Date; end: Date };

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
    this.hostEl.addClass("onprogram-timeline-view");
    const style = this.hostEl.createEl("style");
    style.textContent = TIMELINE_STYLES;

    const result = this.adapter.adapt(this.data);
    const placements = result.items
      .map((item) => getTimelinePlacement(item))
      .filter((placement): placement is TimelinePlacement => placement !== undefined);
    const unscheduled = result.items.filter((item) => !getTimelinePlacement(item));

    this.renderToolbar(unscheduled.length);
    this.renderUnscheduled(unscheduled);
    this.renderTimeline(placements);
  }

  private renderToolbar(unscheduledCount: number): void {
    const toolbar = this.hostEl.createDiv({ cls: "onprogram-timeline-toolbar" });

    const today = toolbar.createEl("button", { text: "Today" });
    today.addEventListener("click", () => this.scrollToNow());

    const unscheduled = toolbar.createSpan({
      text: `Unscheduled ${unscheduledCount}`,
      cls: "onprogram-timeline-unscheduled-count"
    });
    if (unscheduledCount === 0) unscheduled.addClass("is-empty");

    toolbar.createSpan({ cls: "onprogram-timeline-spacer" });

    const zoomControl = toolbar.createDiv({ cls: "onprogram-timeline-zoom-control" });
    zoomControl.createSpan({ text: "Zoom" });
    const select = zoomControl.createEl("select");
    for (const value of timelineZooms()) {
      select.createEl("option", {
        text: zoomLabel(value),
        value
      });
    }
    select.value = this.zoom;
    select.addEventListener("change", () => {
      this.zoom = select.value as TimelineZoom;
      this.render();
      this.scrollToNow();
    });

    const addTask = toolbar.createEl("button", { text: "+ New task" });
    addTask.addEventListener("click", () => this.createTask());
  }

  private createTask(): void {
    new CreateTaskModal(this.app, {
      onSubmit: async (title) => {
        const result = await this.taskCreator.createTask({
          title,
          targetFolder: this.getConfiguredTaskFolder()
        });
        new Notice(`OnProgram: Created ${result.title}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "create timeline task", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private renderUnscheduled(items: WorkItem[]): void {
    if (items.length === 0) return;

    const details = this.hostEl.createEl("details", { cls: "onprogram-timeline-unscheduled" });
    details.createEl("summary", { text: `Unscheduled work (${items.length})` });
    const list = details.createDiv({ cls: "onprogram-timeline-unscheduled-list" });
    for (const item of items) {
      const button = list.createEl("button", { text: item.title });
      button.addEventListener("click", () => this.openItem(item));
    }
  }

  private renderTimeline(placements: TimelinePlacement[]): void {
    const bounds = timelineBounds(placements, this.zoom);
    this.activeBounds = bounds;
    const timelineWidth = Math.max(900, pixelsBetween(bounds.start, bounds.end, this.zoom));

    const shell = this.hostEl.createDiv({ cls: "onprogram-timeline-shell" });
    const labels = shell.createDiv({ cls: "onprogram-timeline-labels" });
    labels.createDiv({ text: "Work item", cls: "onprogram-timeline-label-axis" });

    const scroll = shell.createDiv({ cls: "onprogram-timeline-scroll" });
    this.scrollEl = scroll;
    const canvas = scroll.createDiv({ cls: "onprogram-timeline-canvas" });
    canvas.setCssStyles({ width: `${timelineWidth}px` });

    this.renderAxis(canvas, bounds.start, bounds.end);
    this.renderNow(canvas, bounds.start, timelineWidth);

    const groups = groupPlacements(placements);
    const showGroups = groups.size > 1 || !groups.has("No project");
    let rowIndex = 0;

    if (showGroups) {
      for (const [groupName, groupPlacements] of groups) {
        labels.createDiv({ text: groupName, cls: "onprogram-timeline-group-label" });
        const groupRow = canvas.createDiv({ cls: "onprogram-timeline-group-row" });
        groupRow.setCssStyles({ top: `${AXIS_HEIGHT + rowIndex * ROW_HEIGHT}px` });
        rowIndex += 1;

        for (const placement of groupPlacements) {
          rowIndex = this.renderPlacementRow(labels, canvas, placement, bounds.start, rowIndex);
        }
      }
    } else {
      for (const placement of placements) {
        rowIndex = this.renderPlacementRow(labels, canvas, placement, bounds.start, rowIndex);
      }
    }

    if (placements.length === 0) {
      labels.createDiv({ text: "No dated work items", cls: "onprogram-timeline-empty" });
    }

    const height = Math.max(196, AXIS_HEIGHT + rowIndex * ROW_HEIGHT + ROW_HEIGHT);
    canvas.setCssStyles({ height: `${height}px` });
    labels.setCssStyles({ minHeight: `${height}px` });

    this.hostEl.win.setTimeout(() => this.scrollToNow(false), 0);
  }

  private renderPlacementRow(
    labels: HTMLElement,
    canvas: HTMLElement,
    placement: TimelinePlacement,
    timelineStart: Date,
    rowIndex: number
  ): number {
    labels.appendChild(this.makeLabel(placement));
    const row = canvas.createDiv({ cls: "onprogram-timeline-row" });
    row.setCssStyles({ top: `${AXIS_HEIGHT + rowIndex * ROW_HEIGHT}px` });
    this.renderPlacement(row, placement, timelineStart);
    return rowIndex + 1;
  }

  private renderAxis(canvas: HTMLElement, start: Date, end: Date): void {
    const axis = canvas.createDiv({ cls: "onprogram-timeline-axis" });

    for (const segment of timelineBandSegments(start, end, this.zoom)) {
      const left = pixelsBetween(start, segment.start, this.zoom);
      const width = Math.max(1, pixelsBetween(segment.start, segment.end, this.zoom));
      const band = axis.createDiv({ cls: "onprogram-timeline-band" });
      band.setCssStyles({ left: `${left}px`, width: `${width}px` });
      band.setText(segment.label);
    }

    for (const tick of timelineTickDates(start, end, this.zoom)) {
      const left = pixelsBetween(start, tick, this.zoom);
      const marker = axis.createDiv({ cls: "onprogram-timeline-tick" });
      marker.setCssStyles({ left: `${left}px` });
      marker.createSpan({ text: timelineTickLabel(tick, this.zoom) });

      const gridline = canvas.createDiv({ cls: "onprogram-timeline-gridline" });
      gridline.setCssStyles({ left: `${left}px` });
    }
  }

  private renderNow(canvas: HTMLElement, start: Date, timelineWidth: number): void {
    const now = new Date();
    const left = pixelsBetween(start, now, this.zoom);
    if (left < 0 || left > timelineWidth) return;

    const marker = canvas.createDiv({ cls: "onprogram-timeline-now-marker" });
    marker.setCssStyles({ left: `${left}px` });
    marker.createSpan({ text: isSubdayZoom(this.zoom) ? "Now" : "Today" });
  }

  private makeLabel(placement: TimelinePlacement): HTMLElement {
    const row = this.hostEl.doc.createElement("div");
    row.addClass("onprogram-timeline-label-row");
    const button = row.createEl("button", { text: placement.item.title });
    button.setAttr("title", `${placement.item.title} · ${timelinePlacementLabel(placement)}`);
    button.addEventListener("click", () => this.openItem(placement.item));
    row.createSpan({
      text: placement.item.status,
      cls: "onprogram-timeline-label-meta"
    });
    return row;
  }

  private renderPlacement(
    row: HTMLElement,
    placement: TimelinePlacement,
    timelineStart: Date
  ): void {
    const startDate = timelineDate(
      placement.startIso,
      placement.kind === "point" ? "point" : "start"
    );
    const left = pixelsBetween(timelineStart, startDate, this.zoom);
    const title = `${placement.item.title} · ${timelinePlacementLabel(placement)}`;

    if (placement.kind === "point") {
      const point = row.createDiv({ cls: "onprogram-timeline-point" });
      point.setCssStyles({ left: `${left - 14}px` });
      point.setAttr("title", title);
      this.attachPointDrag(point, placement);
      return;
    }

    const endDate = timelineDate(placement.endIso, "end");
    const width = Math.max(18, pixelsBetween(startDate, endDate, this.zoom));
    const bar = row.createDiv({ cls: "onprogram-timeline-bar" });
    bar.setCssStyles({ left: `${left}px`, width: `${width}px` });
    bar.setAttr("title", title);

    const leftHandle = bar.createDiv({
      cls: "onprogram-timeline-resize onprogram-timeline-resize-start"
    });
    if (width >= 72) {
      bar.createSpan({ text: placement.item.title, cls: "onprogram-timeline-bar-label" });
    }
    const rightHandle = bar.createDiv({
      cls: "onprogram-timeline-resize onprogram-timeline-resize-end"
    });

    this.attachRangeDrag(bar, placement);
    this.attachResize(leftHandle, placement, "start");
    this.attachResize(rightHandle, placement, "end");
  }

  private attachRangeDrag(bar: HTMLElement, placement: TimelinePlacement): void {
    bar.addEventListener("pointerdown", (event) => {
      if ((event.target as HTMLElement).closest(".onprogram-timeline-resize")) return;
      if (this.writing) return;

      const startX = event.clientX;
      const originalTransform = bar.style.transform;
      bar.setPointerCapture(event.pointerId);
      bar.addClass("onprogram-timeline-dragging");

      const move = (moveEvent: PointerEvent) => {
        bar.setCssStyles({ transform: `translateX(${moveEvent.clientX - startX}px)` });
      };

      const finish = (upEvent: PointerEvent) => {
        cleanup(upEvent);
        const deltaMinutes = snapDragMinutes(upEvent.clientX - startX, this.zoom);
        if (deltaMinutes !== 0) void this.shiftPlacement(placement, deltaMinutes);
      };

      const cancel = (cancelEvent: PointerEvent) => cleanup(cancelEvent);
      const cleanup = (endEvent: PointerEvent) => {
        bar.removeEventListener("pointermove", move);
        bar.removeEventListener("pointerup", finish);
        bar.removeEventListener("pointercancel", cancel);
        if (bar.hasPointerCapture(endEvent.pointerId)) bar.releasePointerCapture(endEvent.pointerId);
        bar.removeClass("onprogram-timeline-dragging");
        bar.setCssStyles({ transform: originalTransform });
      };

      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", finish);
      bar.addEventListener("pointercancel", cancel);
    });
  }

  private attachPointDrag(point: HTMLElement, placement: TimelinePlacement): void {
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
        const deltaMinutes = snapDragMinutes(upEvent.clientX - startX, this.zoom);
        if (deltaMinutes !== 0) void this.shiftPlacement(placement, deltaMinutes);
      };

      const cancel = (cancelEvent: PointerEvent) => cleanup(cancelEvent);
      const cleanup = (endEvent: PointerEvent) => {
        point.removeEventListener("pointermove", move);
        point.removeEventListener("pointerup", finish);
        point.removeEventListener("pointercancel", cancel);
        if (point.hasPointerCapture(endEvent.pointerId)) point.releasePointerCapture(endEvent.pointerId);
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
    edge: "start" | "end"
  ): void {
    handle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (this.writing) return;

      const startX = event.clientX;
      handle.setPointerCapture(event.pointerId);
      handle.addClass("onprogram-timeline-resizing");

      const finish = (upEvent: PointerEvent) => {
        cleanup(upEvent);
        const deltaMinutes = snapDragMinutes(upEvent.clientX - startX, this.zoom);
        if (deltaMinutes !== 0) void this.resizePlacement(placement, edge, deltaMinutes);
      };

      const cancel = (cancelEvent: PointerEvent) => cleanup(cancelEvent);
      const cleanup = (endEvent: PointerEvent) => {
        handle.removeEventListener("pointerup", finish);
        handle.removeEventListener("pointercancel", cancel);
        if (handle.hasPointerCapture(endEvent.pointerId)) handle.releasePointerCapture(endEvent.pointerId);
        handle.removeClass("onprogram-timeline-resizing");
      };

      handle.addEventListener("pointerup", finish);
      handle.addEventListener("pointercancel", cancel);
    });
  }

  private async shiftPlacement(
    placement: TimelinePlacement,
    deltaMinutes: number
  ): Promise<void> {
    const item = placement.item;
    const forceTime = isSubdayZoom(this.zoom);
    const patch: WorkItemWritePatch = {};

    if (placement.kind === "point" && placement.pointField) {
      const original = this.getDateField(item, placement.pointField);
      if (!original) return;
      this.setDatePatch(
        patch,
        placement.pointField,
        shiftedDateValue(original, deltaMinutes, forceTime)
      );
    } else if (placement.kind === "range" && placement.sourceStartField) {
      const start = this.getDateField(item, placement.sourceStartField);
      if (!start) return;
      this.setDatePatch(
        patch,
        placement.sourceStartField,
        shiftedDateValue(start, deltaMinutes, forceTime)
      );

      if (placement.sourceEndField === "end" || placement.sourceEndField === "due") {
        const end = this.getDateField(item, placement.sourceEndField);
        if (!end) return;
        this.setDatePatch(
          patch,
          placement.sourceEndField,
          shiftedDateValue(end, deltaMinutes, forceTime)
        );
      }
    }

    await this.write(item, patch, `shift ${item.title}`);
  }

  private async resizePlacement(
    placement: TimelinePlacement,
    edge: "start" | "end",
    deltaMinutes: number
  ): Promise<void> {
    if (placement.kind !== "range" || !placement.sourceStartField || !placement.sourceEndField) {
      return;
    }

    const item = placement.item;
    const forceTime = isSubdayZoom(this.zoom);
    const patch: WorkItemWritePatch = {};

    if (edge === "start") {
      const originalStart = this.getDateField(item, placement.sourceStartField);
      if (!originalStart) return;
      const nextStart = shiftedDateValue(originalStart, deltaMinutes, forceTime);

      if (placement.sourceEndField === "duration") {
        const duration = item.durationMinutes ?? 0;
        const nextDuration = duration - deltaMinutes;
        if (nextDuration <= 0) {
          new Notice("OnProgram: timeline duration must stay greater than zero.");
          return;
        }
        this.setDatePatch(patch, placement.sourceStartField, nextStart);
        patch.durationMinutes = nextDuration;
      } else {
        const end = this.getDateField(item, placement.sourceEndField);
        if (!end) return;
        if (timelineDate(nextStart.iso, "start") >= timelineDate(end.iso, "end")) {
          new Notice("OnProgram: timeline range cannot start after it ends.");
          return;
        }
        this.setDatePatch(patch, placement.sourceStartField, nextStart);
      }
    } else if (placement.sourceEndField === "duration") {
      const duration = item.durationMinutes ?? 0;
      const nextDuration = duration + deltaMinutes;
      if (nextDuration <= 0) {
        new Notice("OnProgram: timeline duration must stay greater than zero.");
        return;
      }
      patch.durationMinutes = nextDuration;
    } else {
      const originalEnd = this.getDateField(item, placement.sourceEndField);
      const start = this.getDateField(item, placement.sourceStartField);
      if (!originalEnd || !start) return;
      const nextEnd = shiftedDateValue(originalEnd, deltaMinutes, forceTime);
      if (timelineDate(nextEnd.iso, "end") <= timelineDate(start.iso, "start")) {
        new Notice("OnProgram: timeline range cannot end before it starts.");
        return;
      }
      this.setDatePatch(patch, placement.sourceEndField, nextEnd);
    }

    await this.write(item, patch, `resize ${item.title}`);
  }

  private getDateField(
    item: WorkItem,
    field: TimelineRangeStartField | Exclude<TimelineRangeEndField, "duration"> | "scheduled"
  ): WorkItemDateValue | undefined {
    if (field === "start") return item.dates.start;
    if (field === "scheduled") return item.dates.scheduled;
    if (field === "end") return item.dates.end;
    return item.dates.due;
  }

  private setDatePatch(
    patch: WorkItemWritePatch,
    field: TimelineRangeStartField | Exclude<TimelineRangeEndField, "duration"> | "scheduled",
    value: WorkItemDateValue
  ): void {
    if (field === "start") patch.start = value;
    else if (field === "scheduled") patch.scheduled = value;
    else if (field === "end") patch.end = value;
    else patch.due = value;
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

  private scrollToNow(smooth = true): void {
    const scroll = this.scrollEl;
    const bounds = this.activeBounds;
    if (!scroll || !bounds) return;

    const nowX = pixelsBetween(bounds.start, new Date(), this.zoom);
    const target = Math.max(0, nowX - scroll.clientWidth * 0.45);
    scroll.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
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
  return groups;
}

function timelineZooms(): readonly TimelineZoom[] {
  return ["fifteen-minute", "hour", "day", "week", "month", "quarter"];
}

function zoomLabel(zoom: TimelineZoom): string {
  if (zoom === "fifteen-minute") return "15 min";
  return zoom.charAt(0).toUpperCase() + zoom.slice(1);
}
