export const WORK_ITEM_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type WorkItemPriority = (typeof WORK_ITEM_PRIORITIES)[number];

export const DEFAULT_WORK_ITEM_PRIORITY: WorkItemPriority = "normal";

export const WORK_ITEM_PRIORITY_RANK: Readonly<Record<WorkItemPriority, number>> = {
  low: 1,
  normal: 2,
  high: 3,
  urgent: 4
};

export function isWorkItemPriority(value: unknown): value is WorkItemPriority {
  return typeof value === "string" && WORK_ITEM_PRIORITIES.includes(value as WorkItemPriority);
}
