import type { ProjectWorkItem, WorkItem } from "../../models/work-item/WorkItem";

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
}

const COMPLETE_STATUSES = new Set(["done", "posted"]);
const EXCLUDED_STATUSES = new Set(["cancelled", "archived"]);

export function calculateProjectProgress(
  project: ProjectWorkItem,
  items: readonly WorkItem[]
): ProjectProgress {
  const linkedTasks = items.filter((item) =>
    item.type === "task"
      && Boolean(item.project)
      && projectReferenceMatches(item.project ?? "", project)
      && !EXCLUDED_STATUSES.has(item.status)
  );

  const completed = linkedTasks.filter((item) => COMPLETE_STATUSES.has(item.status)).length;
  const total = linkedTasks.length;

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
