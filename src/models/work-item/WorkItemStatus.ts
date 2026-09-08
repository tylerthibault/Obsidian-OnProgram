import type { WorkItemType } from "./WorkItemTypes";

export const WORK_ITEM_STATUSES = [
  "inbox",
  "todo",
  "planned",
  "in-progress",
  "blocked",
  "waiting",
  "done",
  "cancelled",
  "archived"
] as const;

export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

export const TERMINAL_WORK_ITEM_STATUSES: readonly WorkItemStatus[] = [
  "done",
  "cancelled",
  "archived"
];

export const DEFAULT_STATUS_BY_TYPE: Readonly<Record<WorkItemType, WorkItemStatus>> = {
  task: "todo",
  project: "planned",
  milestone: "planned",
  event: "planned"
};

export const ALLOWED_STATUSES_BY_TYPE: Readonly<Record<WorkItemType, readonly WorkItemStatus[]>> = {
  task: WORK_ITEM_STATUSES,
  project: ["planned", "in-progress", "blocked", "waiting", "done", "cancelled", "archived"],
  milestone: ["planned", "in-progress", "blocked", "done", "cancelled", "archived"],
  event: ["planned", "in-progress", "done", "cancelled", "archived"]
};

export function isWorkItemStatus(value: unknown): value is WorkItemStatus {
  return typeof value === "string" && WORK_ITEM_STATUSES.includes(value as WorkItemStatus);
}

export function isTerminalWorkItemStatus(status: WorkItemStatus): boolean {
  return TERMINAL_WORK_ITEM_STATUSES.includes(status);
}
