import type {
  ProjectWorkItem,
  TaskWorkItem,
  WorkItem
} from "../../models/work-item/WorkItem";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
}

const COMPLETE_STATUSES = new Set<WorkItemStatus>(["done", "posted"]);
const EXCLUDED_STATUSES = new Set<WorkItemStatus>(["cancelled", "archived"]);

/** All task work items that currently point at this project, including closed work. */
export function getLinkedProjectTasks(
  project: ProjectWorkItem,
  items: readonly WorkItem[]
): TaskWorkItem[] {
  return items.filter((item): item is TaskWorkItem =>
    item.type === "task"
      && Boolean(item.project)
      && projectReferenceMatches(item.project ?? "", project)
  );
}

/** Posted content is completed work for project rollups, just like Done. */
export function isProjectTaskComplete(status: WorkItemStatus): boolean {
  return COMPLETE_STATUSES.has(status);
}

/** Cancelled and archived work does not change the current-work denominator. */
export function isProjectTaskExcluded(status: WorkItemStatus): boolean {
  return EXCLUDED_STATUSES.has(status);
}

export function calculateProjectProgress(
  project: ProjectWorkItem,
  items: readonly WorkItem[]
): ProjectProgress {
  const currentTasks = getLinkedProjectTasks(project, items)
    .filter((item) => !isProjectTaskExcluded(item.status));

  const completed = currentTasks.filter((item) => isProjectTaskComplete(item.status)).length;
  const total = currentTasks.length;

  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
  };
}

export function projectReferenceMatches(
  reference: string,
  project: ProjectWorkItem
): boolean {
  const normalizedReference = normalizeReference(reference);
  if (!normalizedReference) return false;

  const projectPath = normalizeReference(project.source.path);
  const projectBasename = normalizeReference(project.source.basename);
  const projectTitle = normalizeReference(project.title);

  if (
    normalizedReference === projectPath
    || normalizedReference === projectBasename
    || normalizedReference === projectTitle
  ) {
    return true;
  }

  const referenceBasename = normalizedReference.split("/").pop();
  return Boolean(referenceBasename) && (
    referenceBasename === projectBasename
    || referenceBasename === projectTitle
  );
}

function normalizeReference(value: string): string {
  let normalized = value.trim();
  if (!normalized) return "";

  const wikiMatch = /^\[\[(.+)\]\]$/.exec(normalized);
  if (wikiMatch?.[1]) normalized = wikiMatch[1];

  normalized = normalized.split("|")[0] ?? normalized;
  normalized = normalized.replace(/\\/g, "/");
  normalized = normalized.replace(/\.md$/i, "");
  normalized = normalized.replace(/^\/+|\/+$/g, "");

  return normalized.trim().toLowerCase();
}
