import type { WorkItemPriority } from "../../models/work-item/WorkItemPriority";
import { isWorkItemPriority } from "../../models/work-item/WorkItemPriority";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import { isWorkItemStatus } from "../../models/work-item/WorkItemStatus";

export interface LinkedBaseBoardCard {
  basePath: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
}

export function parseLinkedBaseBoardCards(value: unknown): LinkedBaseBoardCard[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    const cards: LinkedBaseBoardCard[] = [];
    const seen = new Set<string>();

    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object") continue;
      const raw = candidate as Record<string, unknown>;
      const basePath = typeof raw.basePath === "string" ? raw.basePath.trim() : "";
      if (!basePath || seen.has(basePath)) continue;

      const status = isWorkItemStatus(raw.status) ? raw.status : "todo";
      const priority = isWorkItemPriority(raw.priority) ? raw.priority : "normal";
      cards.push({ basePath, status, priority });
      seen.add(basePath);
    }

    return cards;
  } catch {
    return [];
  }
}

export function serializeLinkedBaseBoardCards(cards: LinkedBaseBoardCard[]): string {
  return JSON.stringify(cards.map(({ basePath, status, priority }) => ({
    basePath,
    status,
    priority
  })));
}
