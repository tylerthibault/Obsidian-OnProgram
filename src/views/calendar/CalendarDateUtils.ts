import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import type { WorkItemWritePatch } from "../../services/work-items/WorkItemWritePatch";

export type CalendarMode = "month" | "week" | "day";
export type CalendarField = "scheduled" | "due" | "start";

export function getCalendarDate(item: WorkItem, field: CalendarField): WorkItemDateValue | undefined {
  return item.dates[field];
}

export function calendarPatch(
  field: CalendarField,
  value: WorkItemDateValue | null
): WorkItemWritePatch {
  if (field === "scheduled") return { scheduled: value };
  if (field === "due") return { due: value };
  return { start: value };
}

export function moveDateToDay(
  existing: WorkItemDateValue | undefined,
  dayIso: string
): WorkItemDateValue {
  if (existing?.kind === "date-time") {
    const time = existing.iso.slice(11, 16);
    return { kind: "date-time", iso: `${dayIso}T${time}` };
  }
  return { kind: "date", iso: dayIso };
}

export function moveDateToDateTime(dayIso: string, hour: number, minute = 0): WorkItemDateValue {
  return {
    kind: "date-time",
    iso: `${dayIso}T${pad(hour)}:${pad(minute)}`
  };
}

export function datePart(value: WorkItemDateValue): string {
  return value.iso.slice(0, 10);
}

export function timePart(value: WorkItemDateValue): string | undefined {
  return value.kind === "date-time" ? value.iso.slice(11, 16) : undefined;
}

export function localDateIso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function startOfMonthGrid(date: Date): Date {
  return startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function weekLabel(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function calendarTitle(mode: CalendarMode, date: Date): string {
  if (mode === "month") return monthLabel(date);
  if (mode === "week") return weekLabel(date);
  return dayLabel(date);
}

export function navigateCalendar(mode: CalendarMode, date: Date, direction: -1 | 1): Date {
  if (mode === "month") {
    return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  }
  if (mode === "week") return addDays(date, direction * 7);
  return addDays(date, direction);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
