export const WORK_ITEM_DATE_FIELDS = ["start", "end", "due", "scheduled", "completed"] as const;

export type WorkItemDateField = (typeof WORK_ITEM_DATE_FIELDS)[number];

/**
 * Canonical serialized date value used at the schema boundary.
 * Parsing into normalized date objects belongs to Sprint 2.2.
 */
export type WorkItemDateValue = string;

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
