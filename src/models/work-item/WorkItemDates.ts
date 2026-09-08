export const WORK_ITEM_DATE_FIELDS = ["start", "end", "due", "scheduled", "completed"] as const;

export type WorkItemDateField = (typeof WORK_ITEM_DATE_FIELDS)[number];

export type WorkItemDateKind = "date" | "date-time";

/**
 * Normalized date value used inside OnProgram.
 *
 * Date-only values intentionally stay timezone-free so a value such as
 * 2026-09-08 cannot shift to another calendar day when rendered elsewhere.
 */
export interface WorkItemDateValue {
  kind: WorkItemDateKind;
  iso: string;
}

export interface WorkItemDates {
  start?: WorkItemDateValue;
  end?: WorkItemDateValue;
  due?: WorkItemDateValue;
  scheduled?: WorkItemDateValue;
  completed?: WorkItemDateValue;
}

export interface MilestoneWorkItemDates extends WorkItemDates {
  due: WorkItemDateValue;
}

export interface EventWorkItemDates extends WorkItemDates {
  scheduled: WorkItemDateValue;
}

export const WORK_ITEM_DATE_FORMATS = {
  date: "YYYY-MM-DD",
  dateTime: "YYYY-MM-DDTHH:mm"
} as const;
