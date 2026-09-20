export interface TaskTypeDefinition {
  /** Stable value stored in Markdown task_types. */
  id: string;
  /** Human-readable label shown in OnProgram UI. */
  label: string;
  /** Lucide icon name used by Obsidian's setIcon helper. */
  icon: string;
  /** CSS color used for task-type indicators. */
  color: string;
}

export const DEFAULT_TASK_TYPES: TaskTypeDefinition[] = [
  {
    id: "filming",
    label: "Filming",
    icon: "video",
    color: "#8b5cf6"
  },
  {
    id: "posting",
    label: "Posting",
    icon: "send",
    color: "#22c55e"
  }
];

export function normalizeTaskTypeValues(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return [];

  const rawValues = Array.isArray(value) ? value : [value];
  const normalized: string[] = [];

  for (const rawValue of rawValues) {
    if (typeof rawValue !== "string") return undefined;
    const trimmed = rawValue.trim();
    if (!trimmed) return undefined;
    if (!normalized.includes(trimmed)) normalized.push(trimmed);
  }

  return normalized;
}

export function taskTypeDefinitionById(
  definitions: readonly TaskTypeDefinition[],
  id: string
): TaskTypeDefinition | undefined {
  return definitions.find((definition) => definition.id === id);
}

export function createTaskTypeId(label: string, existingIds: readonly string[]): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task-type";

  if (!existingIds.includes(base)) return base;

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existingIds.includes(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}
