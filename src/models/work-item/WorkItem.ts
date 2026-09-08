import type { EventWorkItemDates, MilestoneWorkItemDates, WorkItemDates } from "./WorkItemDates";
import type { WorkItemPriority } from "./WorkItemPriority";
import type { WorkItemStatus } from "./WorkItemStatus";

export type WorkItemReference = string;

export interface WorkItemBase {
  /** Display title. The parser may derive this from the backing Markdown file. */
  title: string;
  status: WorkItemStatus;
  priority?: WorkItemPriority;
  project?: WorkItemReference;
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
