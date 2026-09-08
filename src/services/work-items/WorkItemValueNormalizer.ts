import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { isWorkItemPriority, type WorkItemPriority } from "../../models/work-item/WorkItemPriority";
import { isWorkItemStatus, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import { isWorkItemType, type WorkItemType } from "../../models/work-item/WorkItemTypes";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/;

export function normalizeWorkItemType(value: unknown): WorkItemType | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return isWorkItemType(normalized) ? normalized : undefined;
}

export function normalizeWorkItemStatus(value: unknown): WorkItemStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return isWorkItemStatus(normalized) ? normalized : undefined;
}

export function normalizeWorkItemPriority(value: unknown): WorkItemPriority | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return isWorkItemPriority(normalized) ? normalized : undefined;
}

export function normalizeReference(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeReferenceList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];

  for (const rawValue of rawValues) {
    const reference = normalizeReference(rawValue);
    if (!reference) {
      return undefined;
    }

    if (!normalized.includes(reference)) {
      normalized.push(reference);
    }
  }

  return normalized;
}

export function normalizeDurationMinutes(value: unknown): number | undefined {
  if (typeof value === "number") {
    return isPositiveFiniteNumber(value) ? Math.round(value) : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return undefined;
  }

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);
    return isPositiveFiniteNumber(numeric) ? Math.round(numeric) : undefined;
  }

  const minuteMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)$/);
  if (minuteMatch?.[1]) {
    const minutes = Number(minuteMatch[1]);
    return isPositiveFiniteNumber(minutes) ? Math.round(minutes) : undefined;
  }

  const hourMatch = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)(?:\s+(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes))?$/
  );

  if (hourMatch?.[1]) {
    const hours = Number(hourMatch[1]);
    const minutes = hourMatch[2] ? Number(hourMatch[2]) : 0;
    const total = hours * 60 + minutes;
    return isPositiveFiniteNumber(total) ? Math.round(total) : undefined;
  }

  return undefined;
}

export function normalizeWorkItemDate(value: unknown): WorkItemDateValue | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }

    const iso = formatLocalDateTime(value);
    return { kind: "date-time", iso };
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  const dateMatch = normalized.match(DATE_PATTERN);
  if (dateMatch?.[1] && dateMatch[2] && dateMatch[3]) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    if (!isValidCalendarDate(year, month, day)) {
      return undefined;
    }

    return { kind: "date", iso: normalized };
  }

  const dateTimeMatch = normalized.match(DATE_TIME_PATTERN);
  if (!dateTimeMatch?.[1] || !dateTimeMatch[2] || !dateTimeMatch[3] || !dateTimeMatch[4] || !dateTimeMatch[5]) {
    return undefined;
  }

  const year = Number(dateTimeMatch[1]);
  const month = Number(dateTimeMatch[2]);
  const day = Number(dateTimeMatch[3]);
  const hour = Number(dateTimeMatch[4]);
  const minute = Number(dateTimeMatch[5]);
  const second = dateTimeMatch[6] ? Number(dateTimeMatch[6]) : 0;
  const timezone = dateTimeMatch[8];

  if (!isValidCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }

  if (timezone && timezone !== "Z" && !isValidTimezoneOffset(timezone)) {
    return undefined;
  }

  return {
    kind: "date-time",
    iso: normalized.replace(" ", "T")
  };
}

function isPositiveFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

function isValidTimezoneOffset(value: string): boolean {
  const match = value.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match?.[2] || !match[3]) {
    return false;
  }

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return hours <= 14 && minutes <= 59;
}

function formatLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  const hour = pad2(value.getHours());
  const minute = pad2(value.getMinutes());
  const second = value.getSeconds();

  return `${year}-${month}-${day}T${hour}:${minute}${second > 0 ? `:${pad2(second)}` : ""}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}
