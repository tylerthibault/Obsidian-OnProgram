import { DEFAULT_WORK_ITEM_PRIORITY, type WorkItemPriority } from "./WorkItemPriority";
import type { WorkItemPropertyKey } from "./WorkItemProperties";
import {
  ALLOWED_STATUSES_BY_TYPE,
  DEFAULT_STATUS_BY_TYPE,
  type WorkItemStatus
} from "./WorkItemStatus";
import type { WorkItemType } from "./WorkItemTypes";

export const WORK_ITEM_SCHEMA_VERSION = 1;

export interface WorkItemTypeSchema {
  type: WorkItemType;
  requiredProperties: readonly WorkItemPropertyKey[];
  optionalProperties: readonly WorkItemPropertyKey[];
  allowedStatuses: readonly WorkItemStatus[];
  defaultStatus: WorkItemStatus;
  defaultPriority: WorkItemPriority;
}

const COMMON_OPTIONAL_PROPERTIES = [
  "project",
  "priority",
  "start",
  "end",
  "due",
  "scheduled",
  "duration",
  "completed",
  "parent",
  "dependsOn",
  "linkedBase"
] as const satisfies readonly WorkItemPropertyKey[];

export const WORK_ITEM_TYPE_SCHEMAS: Readonly<Record<WorkItemType, WorkItemTypeSchema>> = {
  task: {
    type: "task",
    requiredProperties: ["type", "status"],
    optionalProperties: COMMON_OPTIONAL_PROPERTIES,
    allowedStatuses: ALLOWED_STATUSES_BY_TYPE.task,
    defaultStatus: DEFAULT_STATUS_BY_TYPE.task,
    defaultPriority: DEFAULT_WORK_ITEM_PRIORITY
  },
  project: {
    type: "project",
    requiredProperties: ["type", "status"],
    optionalProperties: COMMON_OPTIONAL_PROPERTIES,
    allowedStatuses: ALLOWED_STATUSES_BY_TYPE.project,
    defaultStatus: DEFAULT_STATUS_BY_TYPE.project,
    defaultPriority: DEFAULT_WORK_ITEM_PRIORITY
  },
  milestone: {
    type: "milestone",
    requiredProperties: ["type", "status", "due"],
    optionalProperties: COMMON_OPTIONAL_PROPERTIES.filter((property) => property !== "due"),
    allowedStatuses: ALLOWED_STATUSES_BY_TYPE.milestone,
    defaultStatus: DEFAULT_STATUS_BY_TYPE.milestone,
    defaultPriority: DEFAULT_WORK_ITEM_PRIORITY
  },
  event: {
    type: "event",
    requiredProperties: ["type", "status", "scheduled"],
    optionalProperties: COMMON_OPTIONAL_PROPERTIES.filter((property) => property !== "scheduled"),
    allowedStatuses: ALLOWED_STATUSES_BY_TYPE.event,
    defaultStatus: DEFAULT_STATUS_BY_TYPE.event,
    defaultPriority: DEFAULT_WORK_ITEM_PRIORITY
  }
};

export const WORK_ITEM_DATE_BEHAVIOR = {
  start: "Planned beginning of a work range or project range.",
  end: "Planned end of a work range or project range.",
  due: "Deadline. A due date does not by itself mean the work is scheduled for that time.",
  scheduled: "Planned execution date/time and the primary calendar-placement field.",
  completed: "Actual completion date/time. Set when work is completed, not when it is merely due."
} as const;

export const WORK_ITEM_PRIORITY_BEHAVIOR = {
  optional: true,
  defaultWhenMissing: DEFAULT_WORK_ITEM_PRIORITY,
  ordering: ["low", "normal", "high", "urgent"] as const
};

export function getWorkItemTypeSchema(type: WorkItemType): WorkItemTypeSchema {
  return WORK_ITEM_TYPE_SCHEMAS[type];
}
