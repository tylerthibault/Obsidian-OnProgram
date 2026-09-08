export const WORK_ITEM_TYPES = ["task", "project", "milestone", "event"] as const;

export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export function isWorkItemType(value: unknown): value is WorkItemType {
  return typeof value === "string" && WORK_ITEM_TYPES.includes(value as WorkItemType);
}
