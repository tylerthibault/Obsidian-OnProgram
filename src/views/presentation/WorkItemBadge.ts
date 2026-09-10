import { TFile, type App } from "obsidian";
import type { WorkItem } from "../../models/work-item/WorkItem";

export type WorkItemBadgeColor =
  | "accent"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "red"
  | "yellow"
  | "gray"
  | "custom";

export interface WorkItemBadgeConfig {
  property: string;
  color: WorkItemBadgeColor;
  customColor?: string;
}

export function getWorkItemBadgeValue(
  app: App,
  item: WorkItem,
  property: string
): string | undefined {
  return getFileBadgeValue(app, item.source.path, property);
}

export function getFileBadgeValue(
  app: App,
  path: string,
  property: string
): string | undefined {
  const key = property.trim();
  if (!key) return undefined;

  const file = app.vault.getAbstractFileByPath(path);
  if (!(file instanceof TFile)) return undefined;

  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  if (!frontmatter) return undefined;

  return formatBadgeValue(frontmatter[key]);
}

export function createWorkItemBadge(
  parent: HTMLElement,
  value: string,
  config: WorkItemBadgeConfig
): HTMLElement {
  const badge = parent.createSpan({
    text: value,
    cls: "onprogram-work-item-badge"
  });

  applyBadgeAppearance(badge, config);
  return badge;
}

export function applyBadgeAppearance(
  badge: HTMLElement,
  config: WorkItemBadgeConfig
): void {
  badge.dataset.badgeColor = config.color;
  badge.style.removeProperty("--onprogram-badge-color");

  if (config.color === "custom" && config.customColor?.trim()) {
    badge.style.setProperty("--onprogram-badge-color", config.customColor.trim());
  }
}

export function normalizeBadgeColor(value: unknown): WorkItemBadgeColor {
  switch (value) {
    case "green":
    case "blue":
    case "purple":
    case "orange":
    case "red":
    case "yellow":
    case "gray":
    case "custom":
      return value;
    default:
      return "accent";
  }
}

function formatBadgeValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => formatBadgeValue(entry))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
