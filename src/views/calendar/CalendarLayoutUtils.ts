import type { WorkItem } from "../../models/work-item/WorkItem";
import type { LinkedMarkdownInstance } from "../../services/links/LinkedMarkdownInstance";
import { getCalendarDate, type CalendarField } from "./CalendarDateUtils";

export const CALENDAR_RESIZE_SNAP_MINUTES = 30;
export const DEFAULT_TIMED_DURATION_MINUTES = 60;
export const MAX_TIMED_DURATION_MINUTES = 14 * 24 * 60;

export interface TimedCalendarSegment {
  item: WorkItem;
  dayIso: string;
  startMinute: number;
  durationMinutes: number;
  isStart: boolean;
  isEnd: boolean;
}

export function buildTimedSegmentsForDay(
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

export function minuteFromPointer(
  element: HTMLElement,
  event: MouseEvent | DragEvent
): number {
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0) return 0;
  const ratio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  return ratio >= 0.5 ? 30 : 0;
}

export function formatMinuteOfDay(minuteOfDay: number): string {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const date = new Date(2000, 0, 1, hour, minute);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function linkedBasename(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/i, "") || "Linked note";
}

export function linkedInstanceTitle(
  title: string,
  instance: LinkedMarkdownInstance
): string {
  return instance.label?.trim()
    ? `${title} · ${instance.label.trim()}`
    : `${title} ↗`;
}

export function formatHour(hour: number): string {
  const date = new Date(2000, 0, 1, hour);
  return date.toLocaleTimeString(undefined, { hour: "numeric" });
}

export function formatDuration(minutes: number): string {
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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
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
