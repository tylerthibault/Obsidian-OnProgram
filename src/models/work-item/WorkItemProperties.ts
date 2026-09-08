export const WORK_ITEM_PROPERTY_KEYS = [
  "type",
  "status",
  "project",
  "priority",
  "start",
  "end",
  "due",
  "scheduled",
  "duration",
  "completed",
  "parent",
  "dependsOn"
] as const;

export type WorkItemPropertyKey = (typeof WORK_ITEM_PROPERTY_KEYS)[number];

export type WorkItemPropertyMap = Readonly<Record<WorkItemPropertyKey, string>>;

export const DEFAULT_WORK_ITEM_PROPERTY_MAP: WorkItemPropertyMap = {
  type: "type",
  status: "status",
  project: "project",
  priority: "priority",
  start: "start",
  end: "end",
  due: "due",
  scheduled: "scheduled",
  duration: "duration",
  completed: "completed",
  parent: "parent",
  dependsOn: "depends_on"
};

/**
 * Property names are configurable. Defaults use lowercase snake_case where a
 * compound name is needed, but OnProgram does not require that convention.
 */
export function isValidMappedPropertyName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes("\n") && !trimmed.includes("\r");
}
