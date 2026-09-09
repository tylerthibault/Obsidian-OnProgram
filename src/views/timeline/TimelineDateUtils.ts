import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { addDays, localDateIso, parseLocalDate, startOfWeek } from "../calendar/CalendarDateUtils";

export type TimelineZoom =
  | "fifteen-minute"
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter";

export type TimelineRangeStartField = "start" | "scheduled";
export type TimelineRangeEndField = "end" | "due" | "duration";

export interface TimelinePlacement {
  item: WorkItem;
  kind: "range" | "point";
  startIso: string;
  endIso: string;
  sourceStartField?: TimelineRangeStartField;
  sourceEndField?: TimelineRangeEndField;
  pointField?: "due" | "scheduled" | "start";
}

export interface TimelineScale {
  pixelsPerMinute: number;
  snapMinutes: number;
  minWindowMinutes: number;
  paddingBeforeMinutes: number;
  paddingAfterMinutes: number;
}

export interface TimelineBandSegment {
  start: Date;
  end: Date;
  label: string;
}

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

const TIMELINE_SCALES: Readonly<Record<TimelineZoom, TimelineScale>> = {
  "fifteen-minute": {
    pixelsPerMinute: 2,
    snapMinutes: 15,
    minWindowMinutes: 8 * 60,
    paddingBeforeMinutes: 2 * 60,
    paddingAfterMinutes: 4 * 60
  },
  hour: {
    pixelsPerMinute: 0.8,
    snapMinutes: 30,
    minWindowMinutes: 24 * 60,
    paddingBeforeMinutes: 6 * 60,
    paddingAfterMinutes: 12 * 60
  },
  day: {
    pixelsPerMinute: 56 / DAY_MINUTES,
    snapMinutes: 6 * 60,
    minWindowMinutes: 14 * DAY_MINUTES,
    paddingBeforeMinutes: DAY_MINUTES,
    paddingAfterMinutes: 3 * DAY_MINUTES
  },
  week: {
    pixelsPerMinute: 20 / DAY_MINUTES,
    snapMinutes: 12 * 60,
    minWindowMinutes: 42 * DAY_MINUTES,
    paddingBeforeMinutes: 7 * DAY_MINUTES,
    paddingAfterMinutes: 14 * DAY_MINUTES
  },
  month: {
    pixelsPerMinute: 6 / DAY_MINUTES,
    snapMinutes: DAY_MINUTES,
    minWindowMinutes: 120 * DAY_MINUTES,
    paddingBeforeMinutes: 14 * DAY_MINUTES,
    paddingAfterMinutes: 30 * DAY_MINUTES
  },
  quarter: {
    pixelsPerMinute: 2.5 / DAY_MINUTES,
    snapMinutes: DAY_MINUTES,
    minWindowMinutes: 365 * DAY_MINUTES,
    paddingBeforeMinutes: 30 * DAY_MINUTES,
    paddingAfterMinutes: 90 * DAY_MINUTES
  }
};

export function timelineScale(zoom: TimelineZoom): TimelineScale {
  return TIMELINE_SCALES[zoom];
}

export function isSubdayZoom(zoom: TimelineZoom): boolean {
  return zoom === "fifteen-minute" || zoom === "hour";
}

export function getTimelinePlacement(item: WorkItem): TimelinePlacement | undefined {
  const start = item.dates.start;
  const end = item.dates.end;
  const due = item.dates.due;
  const scheduled = item.dates.scheduled;

  if (start && end) {
    return range(item, "start", "end", start.iso, end.iso);
  }

  if (start && due && due.iso !== start.iso) {
    return range(item, "start", "due", start.iso, due.iso);
  }

  if (scheduled && item.durationMinutes && item.durationMinutes > 0) {
    return range(
      item,
      "scheduled",
      "duration",
      scheduled.iso,
      shiftIsoByMinutes(scheduled.iso, item.durationMinutes, true)
    );
  }

  if (start && item.durationMinutes && item.durationMinutes > 0) {
    return range(
      item,
      "start",
      "duration",
      start.iso,
      shiftIsoByMinutes(start.iso, item.durationMinutes, true)
    );
  }

  if (item.type === "milestone" && due) return point(item, "due", due);
  if (scheduled) return point(item, "scheduled", scheduled);
  if (due) return point(item, "due", due);
  if (start) return point(item, "start", start);
  return undefined;
}

export function timelineBounds(
  placements: TimelinePlacement[],
  zoom: TimelineZoom
): { start: Date; end: Date } {
  const now = new Date();
  const scale = timelineScale(zoom);

  let min = now;
  let max = now;

  if (placements.length > 0) {
    const first = placements[0];
    if (first) {
      min = timelineDate(first.startIso, "start");
      max = timelineDate(first.endIso, first.kind === "range" ? "end" : "point");
    }

    for (const placement of placements) {
      const start = timelineDate(placement.startIso, placement.kind === "point" ? "point" : "start");
      const end = timelineDate(placement.endIso, placement.kind === "point" ? "point" : "end");
      if (start < min) min = start;
      if (end > max) max = end;
    }

    if (now < min) min = now;
    if (now > max) max = now;
  }

  let start = addMinutes(min, -scale.paddingBeforeMinutes);
  let end = addMinutes(max, scale.paddingAfterMinutes);

  const currentWindow = minutesBetween(start, end);
  if (currentWindow < scale.minWindowMinutes) {
    const missing = scale.minWindowMinutes - currentWindow;
    start = addMinutes(start, -Math.floor(missing / 3));
    end = addMinutes(end, Math.ceil((missing * 2) / 3));
  }

  if (zoom === "fifteen-minute" || zoom === "hour") {
    start = floorToMinutes(start, zoom === "fifteen-minute" ? 15 : 60);
    end = ceilToMinutes(end, zoom === "fifteen-minute" ? 15 : 60);
  } else {
    start = startOfLocalDay(start);
    end = startOfLocalDay(addDays(end, 1));
  }

  return { start, end };
}

export function timelineDate(
  iso: string,
  role: "start" | "end" | "point" = "start"
): Date {
  const dateIso = iso.slice(0, 10);
  const base = parseLocalDate(dateIso);

  if (iso.length > 10) {
    const hour = Number(iso.slice(11, 13));
    const minute = Number(iso.slice(14, 16));
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      throw new Error(`Invalid local date-time: ${iso}`);
    }
    base.setHours(hour, minute, 0, 0);
    return base;
  }

  if (role === "point") {
    base.setHours(12, 0, 0, 0);
    return base;
  }

  if (role === "end") {
    return addDays(base, 1);
  }

  return base;
}

export function minutesBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / MINUTE;
}

export function pixelsBetween(start: Date, end: Date, zoom: TimelineZoom): number {
  return minutesBetween(start, end) * timelineScale(zoom).pixelsPerMinute;
}

export function snapDragMinutes(deltaPixels: number, zoom: TimelineZoom): number {
  const scale = timelineScale(zoom);
  const rawMinutes = deltaPixels / scale.pixelsPerMinute;
  return Math.round(rawMinutes / scale.snapMinutes) * scale.snapMinutes;
}

export function shiftIsoByMinutes(
  iso: string,
  deltaMinutes: number,
  forceDateTime = false
): string {
  const originalHasTime = iso.length > 10;
  const date = timelineDate(iso, "start");
  date.setMinutes(date.getMinutes() + deltaMinutes);

  if (!forceDateTime && !originalHasTime && deltaMinutes % DAY_MINUTES === 0) {
    return localDateIso(date);
  }

  return localDateTimeIso(date);
}

export function shiftedDateValue(
  original: WorkItemDateValue,
  deltaMinutes: number,
  forceDateTime = false
): WorkItemDateValue {
  const iso = shiftIsoByMinutes(
    original.iso,
    deltaMinutes,
    forceDateTime || original.kind === "date-time"
  );
  return iso.length > 10 ? { kind: "date-time", iso } : { kind: "date", iso };
}

export function timelineTickDates(start: Date, end: Date, zoom: TimelineZoom): Date[] {
  const ticks: Date[] = [];
  let cursor = firstTick(start, zoom);
  let guard = 0;

  while (cursor <= end && guard < 20_000) {
    ticks.push(new Date(cursor));
    cursor = nextTick(cursor, zoom);
    guard += 1;
  }

  return ticks;
}

export function timelineTickLabel(date: Date, zoom: TimelineZoom): string {
  if (zoom === "fifteen-minute") {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (zoom === "hour") {
    return date.toLocaleTimeString(undefined, { hour: "numeric" });
  }
  if (zoom === "day") {
    return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  }
  if (zoom === "week") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (zoom === "month") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  return `Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export function timelineBandSegments(
  start: Date,
  end: Date,
  zoom: TimelineZoom
): TimelineBandSegment[] {
  if (zoom === "fifteen-minute" || zoom === "hour") {
    return calendarSegments(start, end, "day");
  }
  if (zoom === "day" || zoom === "week") {
    return calendarSegments(start, end, "month");
  }
  return calendarSegments(start, end, "year");
}

export function timelineBandLabel(date: Date, zoom: TimelineZoom): string {
  if (zoom === "fifteen-minute" || zoom === "hour") {
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  if (zoom === "day" || zoom === "week") {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  return String(date.getFullYear());
}

export function timelinePlacementLabel(placement: TimelinePlacement): string {
  const start = timelineDate(
    placement.startIso,
    placement.kind === "point" ? "point" : "start"
  );

  if (placement.kind === "point") {
    return placement.startIso.length > 10
      ? start.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      : start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const end = timelineDate(placement.endIso, "end");
  return `${formatTimelineMoment(start, placement.startIso.length > 10)} – ${formatTimelineMoment(
    end,
    placement.endIso.length > 10 || placement.sourceEndField === "duration"
  )}`;
}

function range(
  item: WorkItem,
  sourceStartField: TimelineRangeStartField,
  sourceEndField: TimelineRangeEndField,
  startIso: string,
  endIso: string
): TimelinePlacement {
  return {
    item,
    kind: "range",
    startIso,
    endIso,
    sourceStartField,
    sourceEndField
  };
}

function point(
  item: WorkItem,
  field: "due" | "scheduled" | "start",
  value: WorkItemDateValue
): TimelinePlacement {
  return {
    item,
    kind: "point",
    startIso: value.iso,
    endIso: value.iso,
    pointField: field
  };
}

function firstTick(start: Date, zoom: TimelineZoom): Date {
  if (zoom === "fifteen-minute") return floorToMinutes(start, 15);
  if (zoom === "hour") return floorToMinutes(start, 60);
  if (zoom === "day") return startOfLocalDay(start);
  if (zoom === "week") return startOfWeek(start);
  if (zoom === "month") return new Date(start.getFullYear(), start.getMonth(), 1);
  const quarterMonth = Math.floor(start.getMonth() / 3) * 3;
  return new Date(start.getFullYear(), quarterMonth, 1);
}

function nextTick(date: Date, zoom: TimelineZoom): Date {
  if (zoom === "fifteen-minute") return addMinutes(date, 15);
  if (zoom === "hour") return addMinutes(date, 60);
  if (zoom === "day") return addDays(date, 1);
  if (zoom === "week") return addDays(date, 7);
  if (zoom === "month") return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear(), date.getMonth() + 3, 1);
}

function calendarSegments(
  start: Date,
  end: Date,
  unit: "day" | "month" | "year"
): TimelineBandSegment[] {
  const segments: TimelineBandSegment[] = [];
  let cursor = segmentStart(start, unit);
  let guard = 0;

  while (cursor < end && guard < 5_000) {
    const next = segmentNext(cursor, unit);
    const visibleStart = cursor < start ? new Date(start) : new Date(cursor);
    const visibleEnd = next > end ? new Date(end) : new Date(next);
    segments.push({
      start: visibleStart,
      end: visibleEnd,
      label: unit === "day"
        ? cursor.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
          })
        : unit === "month"
          ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
          : String(cursor.getFullYear())
    });
    cursor = next;
    guard += 1;
  }

  return segments;
}

function segmentStart(date: Date, unit: "day" | "month" | "year"): Date {
  if (unit === "day") return startOfLocalDay(date);
  if (unit === "month") return new Date(date.getFullYear(), date.getMonth(), 1);
  return new Date(date.getFullYear(), 0, 1);
}

function segmentNext(date: Date, unit: "day" | "month" | "year"): Date {
  if (unit === "day") return addDays(date, 1);
  if (unit === "month") return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return new Date(date.getFullYear() + 1, 0, 1);
}

function addMinutes(date: Date, minutes: number): Date {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() + minutes);
  return copy;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function floorToMinutes(date: Date, step: number): Date {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  const totalMinutes = copy.getHours() * 60 + copy.getMinutes();
  const floored = Math.floor(totalMinutes / step) * step;
  copy.setHours(0, floored, 0, 0);
  return copy;
}

function ceilToMinutes(date: Date, step: number): Date {
  const floored = floorToMinutes(date, step);
  return floored < date ? addMinutes(floored, step) : floored;
}

function localDateTimeIso(date: Date): string {
  return `${localDateIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTimelineMoment(date: Date, includeTime: boolean): string {
  return includeTime
    ? date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
