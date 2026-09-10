import type { EventWorkItemDates, MilestoneWorkItemDates, WorkItemDates } from "./WorkItemDates";
import type { WorkItemPriority } from "./WorkItemPriority";
import type { WorkItemStatus } from "./WorkItemStatus";

export type WorkItemReference = string;

export interface WorkItemSource {
  path: string;
  basename: string;
  /** File modification time captured when this work item was parsed. */
  mtime: number;
}

export interface WorkItemBase {
  /** Backing Markdown file. The file remains the source of truth. */
  source: WorkItemSource;
  /** Display title, currently derived from the backing Markdown filename. */
  title: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  project?: WorkItemReference;
  /** Optional link to a child OnProgram Base used for drill-down navigation. */
  linkedBase?: WorkItemReference;
  dates: WorkItemDates;
  /** Duration in minutes when the item represents scheduled work. */
  durationMinutes?: number;
  parent?: WorkItemReference;
  dependsOn: WorkItemReference[];
}

export interface TaskWorkItem extends WorkItemBase {
  type: "task";
}

export interface ProjectWorkItem extends WorkItemBase {
  type: "project";
}

export interface MilestoneWorkItem extends Omit<WorkItemBase, "dates"> {
  type: "milestone";
  dates: MilestoneWorkItemDates;
}

export interface EventWorkItem extends Omit<WorkItemBase, "dates"> {
  type: "event";
  dates: EventWorkItemDates;
}

export type WorkItem = TaskWorkItem | ProjectWorkItem | MilestoneWorkItem | EventWorkItem;
