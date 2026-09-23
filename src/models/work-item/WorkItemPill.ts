export const WORK_ITEM_PILL_COLORS = [
  "accent",
  "green",
  "blue",
  "purple",
  "orange",
  "red",
  "yellow",
  "gray"
] as const;

export type WorkItemPillColor = (typeof WORK_ITEM_PILL_COLORS)[number];

export interface WorkItemPill {
  type: string;
  value: string;
  color?: WorkItemPillColor;
  icon?: string;
}

export interface ParsedWorkItemPills {
  pills: WorkItemPill[];
  invalidEntries: number;
  invalidContainer: boolean;
}

export function parseWorkItemPills(value: unknown): ParsedWorkItemPills {
  if (value === undefined || value === null || value === "") {
    return { pills: [], invalidEntries: 0, invalidContainer: false };
  }

  if (!Array.isArray(value)) {
    return { pills: [], invalidEntries: 0, invalidContainer: true };
  }

  const pills: WorkItemPill[] = [];
  let invalidEntries = 0;

  for (const entry of value) {
    const pill = normalizeWorkItemPill(entry);
    if (!pill) {
      invalidEntries += 1;
      continue;
    }
    pills.push(pill);
  }

  return { pills, invalidEntries, invalidContainer: false };
}

export function normalizeWorkItemPill(value: unknown): WorkItemPill | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const type = stringValue(raw.type);
  const pillValue = stringValue(raw.value);
  if (!type || !pillValue) return undefined;

  const pill: WorkItemPill = { type, value: pillValue };
  const color = normalizeWorkItemPillColor(raw.color);
  const icon = stringValue(raw.icon);
  if (color) pill.color = color;
  if (icon) pill.icon = icon;
  return pill;
}

export function normalizeWorkItemPillColor(value: unknown): WorkItemPillColor | undefined {
  return typeof value === "string" && WORK_ITEM_PILL_COLORS.includes(value as WorkItemPillColor)
    ? value as WorkItemPillColor
    : undefined;
}

export function isWorkItemPillList(value: unknown): value is WorkItemPill[] {
  return Array.isArray(value) && value.every((entry) => Boolean(normalizeWorkItemPill(entry)));
}

export function cloneWorkItemPills(pills: readonly WorkItemPill[]): WorkItemPill[] {
  return pills.map((pill) => ({ ...pill }));
}

export function resolveWorkItemPillColor(pill: WorkItemPill): WorkItemPillColor {
  if (pill.color) return pill.color;

  switch (pill.type.trim().toLowerCase()) {
    case "software": return "purple";
    case "client": return "blue";
    case "format":
    case "content_type":
    case "content-type": return "orange";
    case "niche":
    case "category": return "green";
    case "platform": return "red";
  }

  const palette: readonly WorkItemPillColor[] = [
    "accent", "blue", "purple", "green", "orange", "yellow", "red", "gray"
  ];
  let hash = 0;
  for (const char of pill.type.trim().toLowerCase()) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length] ?? "accent";
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
