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

export interface WorkItemPropertyMapIssue {
  key: WorkItemPropertyKey;
  message: string;
}

/**
 * Property names are configurable. Defaults use lowercase snake_case where a
 * compound name is needed, but OnProgram does not require that convention.
 */
export function isValidMappedPropertyName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes("\n") && !trimmed.includes("\r");
}

/**
 * Writers require a one-to-one property map. Mapping two canonical fields to
 * the same YAML key could overwrite unrelated OnProgram data.
 */
export function validateWorkItemPropertyMap(
  propertyMap: WorkItemPropertyMap
): WorkItemPropertyMapIssue[] {
  const issues: WorkItemPropertyMapIssue[] = [];
  const owners = new Map<string, WorkItemPropertyKey>();

  for (const key of WORK_ITEM_PROPERTY_KEYS) {
    const mappedName = propertyMap[key];

    if (!isValidMappedPropertyName(mappedName)) {
      issues.push({
        key,
        message: `Property mapping for '${key}' is empty or contains a line break.`
      });
      continue;
    }

    const normalizedName = mappedName.trim();
    const existingOwner = owners.get(normalizedName);
    if (existingOwner) {
      issues.push({
        key,
        message: `Property mapping '${normalizedName}' is shared by '${existingOwner}' and '${key}'.`
      });
      continue;
    }

    owners.set(normalizedName, key);
  }

  return issues;
}
