import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { addDays, datePart, localDateIso, parseLocalDate } from "../calendar/CalendarDateUtils";

export type TimelineZoom = "day" | "week" | "month" | "quarter";

export interface TimelinePlacement {
  item: WorkItem;
  kind: "range" | "point";
  startIso: string;
  endIso: string;
  sourceStartField?: "start";
  sourceEndField?: "end" | "due";
  pointField?: "due" | "scheduled" | "start";
}

export const TIMELINE_PIXELS_PER_DAY: Readonly<Record<TimelineZoom, number>> = {
  day: 34,
  week: 14,
  month: 5,
  quarter: 2
};

export function getTimelinePlacement(item: WorkItem): TimelinePlacement | undefined {
  const start = item.dates.start;
  const end = item.dates.end;

  if (start && end) {
    return {
      item,
      kind: "range",
      startIso: datePart(start),
      endIso: datePart(end),
      sourceStartField: "start",
      sourceEndField: "end"
    };
  }

  if (start && item.dates.due && datePart(item.dates.due) !== datePart(start)) {
    return {
      item,
      kind: "range",
      startIso: datePart(start),
      endIso: datePart(item.dates.due),
      sourceStartField: "start",
      sourceEndField: "due"
    };
  }

  if (item.type === "milestone" && item.dates.due) {
    return point(item, "due", item.dates.due);
  }

  if (item.dates.scheduled) return point(item, "scheduled", item.dates.scheduled);
  if (item.dates.due) return point(item, "due", item.dates.due);
  if (item.dates.start) return point(item, "start", item.dates.start);
  return undefined;
}

export function timelineBounds(placements: TimelinePlacement[]): { start: Date; end: Date } {
  const today = new Date();
  const first = placements.at(0);
  if (!first) {
    return { start: addDays(today, -14), end: addDays(today, 45) };
  }

  let min = parseLocalDate(first.startIso);
  let max = parseLocalDate(first.endIso);

  for (const placement of placements) {
    const start = parseLocalDate(placement.startIso);
    const end = parseLocalDate(placement.endIso);
    if (start < min) min = start;
    if (end > max) max = end;
  }

  if (today < min) min = today;
  if (today > max) max = today;

  return { start: addDays(min, -7), end: addDays(max, 14) };
}

export function daysBetween(start: Date, end: Date): number {
  const oneDay = 86_400_000;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / oneDay);
}

export function shiftIsoDate(iso: string, deltaDays: number): string {
  return localDateIso(addDays(parseLocalDate(iso), deltaDays));
}

export function preserveDateKind(original: WorkItemDateValue | undefined, isoDate: string): WorkItemDateValue {
  if (original?.kind === "date-time") {
    return { kind: "date-time", iso: `${isoDate}T${original.iso.slice(11, 16)}` };
  }
  return { kind: "date", iso: isoDate };
}

export function timelineTickDates(start: Date, end: Date, zoom: TimelineZoom): Date[] {
  const step = zoom === "day" ? 1 : zoom === "week" ? 7 : zoom === "month" ? 30 : 90;
  const ticks: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, step)) {
    ticks.push(cursor);
  }
  return ticks;
}

export function timelineTickLabel(date: Date, zoom: TimelineZoom): string {
  if (zoom === "day") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (zoom === "week") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (zoom === "month") {
    return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

function point(
  item: WorkItem,
  field: "due" | "scheduled" | "start",
  value: WorkItemDateValue
): TimelinePlacement {
  const iso = datePart(value);
  return {
    item,
    kind: "point",
    startIso: iso,
    endIso: iso,
    pointField: field
  };
}
