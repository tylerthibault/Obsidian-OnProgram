import { normalizeWorkItemDate, type NormalizedWorkItemDate } from "../work-items/WorkItemValueNormalizer";

export interface LinkedMarkdownInstance {
  /** Stable identity for this appearance. Multiple instances may target the same Markdown file. */
  id: string;
  /** Vault-relative Markdown path. */
  targetPath: string;
  /** Calendar placement owned by the instance, not by the target note. */
  scheduled: string;
  /** Optional human-readable purpose such as TikTok, Newsletter, Review, or Repost. */
  label?: string;
  /** Instance-owned duration for timed Calendar placement. */
  durationMinutes?: number;
}

export interface ParsedLinkedMarkdownInstances {
  instances: LinkedMarkdownInstance[];
  invalidCount: number;
}

export function parseLinkedMarkdownInstances(value: unknown): ParsedLinkedMarkdownInstances {
  if (typeof value !== "string" || !value.trim()) {
    return { instances: [], invalidCount: 0 };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return { instances: [], invalidCount: 1 };

    const instances: LinkedMarkdownInstance[] = [];
    const ids = new Set<string>();
    let invalidCount = 0;

    for (const candidate of parsed) {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
        invalidCount += 1;
        continue;
      }

      const raw = candidate as Record<string, unknown>;
      const id = stringValue(raw.id);
      const targetPath = stringValue(raw.targetPath);
      const scheduled = normalizeScheduled(raw.scheduled);

      if (!id || !targetPath || !scheduled || ids.has(id)) {
        invalidCount += 1;
        continue;
      }

      const label = stringValue(raw.label);
      const durationMinutes = positiveInteger(raw.durationMinutes);
      const instance: LinkedMarkdownInstance = {
        id,
        targetPath,
        scheduled: scheduled.iso
      };

      if (label) instance.label = label;
      if (durationMinutes !== undefined) instance.durationMinutes = durationMinutes;

      instances.push(instance);
      ids.add(id);
    }

    return { instances, invalidCount };
  } catch {
    return { instances: [], invalidCount: 1 };
  }
}

export function serializeLinkedMarkdownInstances(
  instances: LinkedMarkdownInstance[]
): string {
  return JSON.stringify(instances.map((instance) => {
    const serialized: LinkedMarkdownInstance = {
      id: instance.id,
      targetPath: instance.targetPath,
      scheduled: instance.scheduled
    };

    if (instance.label?.trim()) serialized.label = instance.label.trim();
    if (instance.durationMinutes !== undefined) {
      serialized.durationMinutes = instance.durationMinutes;
    }

    return serialized;
  }));
}

export function createLinkedMarkdownInstanceId(
  existing: readonly LinkedMarkdownInstance[]
): string {
  const used = new Set(existing.map((instance) => instance.id));

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const randomPart = Math.random().toString(36).slice(2, 8);
    const id = `link-${Date.now().toString(36)}-${randomPart}`;
    if (!used.has(id)) return id;
  }

  let suffix = 1;
  while (used.has(`link-${Date.now().toString(36)}-${suffix}`)) suffix += 1;
  return `link-${Date.now().toString(36)}-${suffix}`;
}

export function normalizeLinkedInstanceSchedule(value: unknown): NormalizedWorkItemDate | undefined {
  return normalizeScheduled(value);
}

function normalizeScheduled(value: unknown): NormalizedWorkItemDate | undefined {
  return normalizeWorkItemDate(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) return undefined;
  return value;
}
