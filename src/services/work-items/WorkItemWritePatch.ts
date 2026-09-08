import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import type { WorkItemPriority } from "../../models/work-item/WorkItemPriority";
import type { WorkItemPropertyKey } from "../../models/work-item/WorkItemProperties";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";

export interface WorkItemWritePatch {
  status?: WorkItemStatus;
  priority?: WorkItemPriority | null;
  project?: string | null;
  start?: WorkItemDateValue | null;
  end?: WorkItemDateValue | null;
  due?: WorkItemDateValue | null;
  scheduled?: WorkItemDateValue | null;
  durationMinutes?: number | null;
  completed?: WorkItemDateValue | null;
  parent?: string | null;
  dependsOn?: string[] | null;
}

export interface WorkItemWriteOptions {
  /** Refuse the write if the file has changed since this modification time. */
  expectedMtime?: number;
}

export interface WorkItemWriteResult {
  path: string;
  changedProperties: WorkItemPropertyKey[];
  beforeMtime: number;
  afterMtime: number;
}
