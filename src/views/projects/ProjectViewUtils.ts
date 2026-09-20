import type {
  MilestoneWorkItem,
  ProjectWorkItem,
  TaskWorkItem,
  WorkItem
} from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { WORK_ITEM_PRIORITY_RANK } from "../../models/work-item/WorkItemPriority";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import {
  isProjectTaskComplete,
  isProjectTaskExcluded,
  projectReferenceMatches
} from "../../services/projects/ProjectRollup";
import { localDateIso, localTimeIso } from "../../utils/dateTime";

export const INACTIVE_PROJECT_STATUSES = new Set<WorkItemStatus>([
  "done",
  "cancelled",
  "archived"
]);
export const BLOCKED_TASK_STATUSES = new Set<WorkItemStatus>(["blocked", "waiting"]);
export const CHECKBOX_LOCKED_STATUSES = new Set<WorkItemStatus>([
  "posted",
  "cancelled",
  "archived"
]);
export const UP_NEXT_STATUSES = new Set<WorkItemStatus>([
  "inbox",
  "todo",
  "planned",
  "scheduled"
]);

export interface ProjectHealth {
  remaining: number;
  blocked: number;
  overdue: number;
  scheduled: number;
}

export interface TaskDisplayDate {
  label: "Scheduled" | "Due" | "Starts";
  value: WorkItemDateValue;
}

export function getProjectHealth(tasks: readonly TaskWorkItem[]): ProjectHealth {
  const current = tasks.filter((task) => !isProjectTaskExcluded(task.status));
  const open = current.filter((task) => !isProjectTaskComplete(task.status));

  return {
    remaining: open.length,
    blocked: open.filter((task) => BLOCKED_TASK_STATUSES.has(task.status)).length,
    overdue: open.filter((task) => isOverdue(task)).length,
    scheduled: open.filter((task) => Boolean(task.dates.scheduled)).length
  };
}

export function getLinkedMilestones(
  project: ProjectWorkItem,
  items: readonly WorkItem[]
): MilestoneWorkItem[] {
  return items.filter((item): item is MilestoneWorkItem =>
    item.type === "milestone"
      && Boolean(item.project)
      && projectReferenceMatches(item.project ?? "", project)
  );
}

export function getNextUpTasks(tasks: readonly TaskWorkItem[]): TaskWorkItem[] {
  return tasks
    .filter((task) =>
      !isProjectTaskExcluded(task.status)
      && !isProjectTaskComplete(task.status)
      && !BLOCKED_TASK_STATUSES.has(task.status)
    )
    .slice()
    .sort((a, b) => {
      const statusDiff = nextStatusRank(a.status) - nextStatusRank(b.status);
      if (statusDiff !== 0) return statusDiff;

      const aDate = taskSortDate(a);
      const bDate = taskSortDate(b);
      if (aDate !== bDate) return aDate.localeCompare(bDate);

      const priorityDiff =
        WORK_ITEM_PRIORITY_RANK[b.priority] - WORK_ITEM_PRIORITY_RANK[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title);
    });
}

export function sortProjectTasks(tasks: readonly TaskWorkItem[]): TaskWorkItem[] {
  return tasks.slice().sort((a, b) => {
    const aDate = taskSortDate(a);
    const bDate = taskSortDate(b);
    if (aDate !== bDate) return aDate.localeCompare(bDate);

    const priorityDiff =
      WORK_ITEM_PRIORITY_RANK[b.priority] - WORK_ITEM_PRIORITY_RANK[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title);
  });
}

export function getTaskDisplayDate(
  task: TaskWorkItem
): TaskDisplayDate | undefined {
  if (task.dates.scheduled) return { label: "Scheduled", value: task.dates.scheduled };
  if (task.dates.due) return { label: "Due", value: task.dates.due };
  if (task.dates.start) return { label: "Starts", value: task.dates.start };
  return undefined;
}

export function projectReferenceForWrite(project: ProjectWorkItem): string {
  const path = project.source.path.replace(/\.md$/i, "");
  return `[[${path}]]`;
}

export function currentLocalDateTime(): WorkItemDateValue {
  const now = new Date();
  return {
    kind: "date-time",
    iso: `${localDateIso(now)}T${localTimeIso(now)}`
  };
}

export function formatDate(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return value;

  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatDateTime(value: string): string {
  if (!value.includes("T")) return formatDate(value);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "");
}

function nextStatusRank(status: WorkItemStatus): number {
  if (status === "in-progress") return 0;
  if (status === "scheduled") return 1;
  if (status === "planned") return 2;
  if (status === "todo") return 3;
  if (status === "inbox") return 4;
  return 5;
}

function taskSortDate(task: TaskWorkItem): string {
  const values = [
    task.dates.due?.iso,
    task.dates.scheduled?.iso,
    task.dates.start?.iso
  ]
    .filter((value): value is string => Boolean(value))
    .sort();

  return values[0] ?? "9999-12-31T23:59";
}

function isOverdue(task: TaskWorkItem): boolean {
  const due = task.dates.due?.iso.split("T")[0];
  return Boolean(due && due < localDateIso(new Date()));
}
