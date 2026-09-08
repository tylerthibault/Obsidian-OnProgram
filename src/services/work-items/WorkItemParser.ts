import type { TFile } from "obsidian";
import type {
  EventWorkItem,
  MilestoneWorkItem,
  WorkItem,
  WorkItemBase
} from "../../models/work-item/WorkItem";
import {
  WORK_ITEM_DATE_FIELDS,
  type WorkItemDates
} from "../../models/work-item/WorkItemDates";
import type {
  WorkItemPropertyKey,
  WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { WorkItemType } from "../../models/work-item/WorkItemTypes";
import {
  hasValidationErrors,
  type WorkItemParseResult,
  type WorkItemValidationIssue
} from "./WorkItemParseResult";
import {
  normalizeDurationMinutes,
  normalizeReference,
  normalizeReferenceList,
  normalizeWorkItemDate,
  normalizeWorkItemPriority,
  normalizeWorkItemStatus,
  normalizeWorkItemType
} from "./WorkItemValueNormalizer";

export type WorkItemFrontmatter = Record<string, unknown>;

export class WorkItemParser {
  constructor(private readonly getPropertyMap: () => WorkItemPropertyMap) {}

  parse(file: TFile, frontmatter: WorkItemFrontmatter | undefined): WorkItemParseResult {
    const propertyMap = this.getPropertyMap();
    const rawType = this.read(frontmatter, propertyMap, "type");

    if (!hasValue(rawType)) {
      return {
        kind: "ignored",
        path: file.path,
        reason: "missing-type"
      };
    }

    const type = normalizeWorkItemType(rawType);
    if (!type) {
      return this.invalid(file, [
        {
          severity: "error",
          code: "invalid-type",
          property: "type",
          value: rawType,
          message: `Unsupported work item type: ${formatValue(rawType)}`
        }
      ]);
    }

    const schema = getWorkItemTypeSchema(type);
    const issues: WorkItemValidationIssue[] = [];

    for (const property of schema.requiredProperties) {
      const value = this.read(frontmatter, propertyMap, property);
      if (!hasValue(value)) {
        issues.push({
          severity: "error",
          code: "missing-required-property",
          property,
          message: `Missing required property '${propertyMap[property]}'.`
        });
      }
    }

    const status = this.parseStatus(
      this.read(frontmatter, propertyMap, "status"),
      type,
      issues
    );

    const priority = this.parsePriority(
      this.read(frontmatter, propertyMap, "priority"),
      schema.defaultPriority,
      issues
    );

    const dates = this.parseDates(frontmatter, propertyMap, issues);
    const project = this.parseOptionalReference(
      this.read(frontmatter, propertyMap, "project"),
      "project",
      issues
    );
    const parent = this.parseOptionalReference(
      this.read(frontmatter, propertyMap, "parent"),
      "parent",
      issues
    );
    const dependsOn = this.parseDependsOn(
      this.read(frontmatter, propertyMap, "dependsOn"),
      issues
    );
    const durationMinutes = this.parseDuration(
      this.read(frontmatter, propertyMap, "duration"),
      issues
    );

    if (!status || hasValidationErrors(issues)) {
      return this.invalid(file, issues);
    }

    const base: WorkItemBase = {
      source: {
        path: file.path,
        basename: file.basename,
        mtime: file.stat.mtime
      },
      title: file.basename,
      status,
      priority,
      dates,
      dependsOn
    };

    if (project) {
      base.project = project;
    }

    if (parent) {
      base.parent = parent;
    }

    if (durationMinutes !== undefined) {
      base.durationMinutes = durationMinutes;
    }

    const item = this.createTypedItem(type, base, dates);
    if (!item) {
      return this.invalid(file, issues);
    }

    return {
      kind: "valid",
      item,
      issues
    };
  }

  private parseStatus(
    value: unknown,
    type: WorkItemType,
    issues: WorkItemValidationIssue[]
  ): WorkItemStatus | undefined {
    if (!hasValue(value)) {
      return undefined;
    }

    const status = normalizeWorkItemStatus(value);
    if (!status) {
      issues.push({
        severity: "error",
        code: "invalid-status",
        property: "status",
        value,
        message: `Invalid status: ${formatValue(value)}`
      });
      return undefined;
    }

    const schema = getWorkItemTypeSchema(type);
    if (!schema.allowedStatuses.includes(status)) {
      issues.push({
        severity: "error",
        code: "status-not-allowed",
        property: "status",
        value,
        message: `Status '${status}' is not allowed for ${type} work items.`
      });
      return undefined;
    }

    return status;
  }

  private parsePriority(
    value: unknown,
    defaultPriority: WorkItemBase["priority"],
    issues: WorkItemValidationIssue[]
  ): WorkItemBase["priority"] {
    if (!hasValue(value)) {
      return defaultPriority;
    }

    const priority = normalizeWorkItemPriority(value);
    if (!priority) {
      issues.push({
        severity: "error",
        code: "invalid-priority",
        property: "priority",
        value,
        message: `Invalid priority: ${formatValue(value)}`
      });
      return defaultPriority;
    }

    return priority;
  }

  private parseDates(
    frontmatter: WorkItemFrontmatter | undefined,
    propertyMap: WorkItemPropertyMap,
    issues: WorkItemValidationIssue[]
  ): WorkItemDates {
    const dates: WorkItemDates = {};

    for (const field of WORK_ITEM_DATE_FIELDS) {
      const value = this.read(frontmatter, propertyMap, field);
      if (!hasValue(value)) {
        continue;
      }

      const normalized = normalizeWorkItemDate(value);
      if (!normalized) {
        issues.push({
          severity: "error",
          code: "invalid-date",
          property: field,
          value,
          message: `Invalid ${field} date: ${formatValue(value)}`
        });
        continue;
      }

      dates[field] = normalized;
    }

    return dates;
  }

  private parseOptionalReference(
    value: unknown,
    property: "project" | "parent",
    issues: WorkItemValidationIssue[]
  ): string | undefined {
    if (!hasValue(value)) {
      return undefined;
    }

    const reference = normalizeReference(value);
    if (!reference) {
      issues.push({
        severity: "error",
        code: "invalid-reference",
        property,
        value,
        message: `Property '${property}' must contain a non-empty string reference.`
      });
      return undefined;
    }

    return reference;
  }

  private parseDependsOn(value: unknown, issues: WorkItemValidationIssue[]): string[] {
    if (!hasValue(value)) {
      return [];
    }

    const references = normalizeReferenceList(value);
    if (!references) {
      issues.push({
        severity: "error",
        code: "invalid-reference-list",
        property: "dependsOn",
        value,
        message: "Dependencies must be a string reference or a list of string references."
      });
      return [];
    }

    return references;
  }

  private parseDuration(value: unknown, issues: WorkItemValidationIssue[]): number | undefined {
    if (!hasValue(value)) {
      return undefined;
    }

    const duration = normalizeDurationMinutes(value);
    if (duration === undefined) {
      issues.push({
        severity: "error",
        code: "invalid-duration",
        property: "duration",
        value,
        message: `Invalid duration: ${formatValue(value)}`
      });
      return undefined;
    }

    return duration;
  }

  private createTypedItem(
    type: WorkItemType,
    base: WorkItemBase,
    dates: WorkItemDates
  ): WorkItem | undefined {
    if (type === "milestone") {
      if (!dates.due) {
        return undefined;
      }

      const item: MilestoneWorkItem = {
        ...base,
        type,
        dates: {
          ...dates,
          due: dates.due
        }
      };
      return item;
    }

    if (type === "event") {
      if (!dates.scheduled) {
        return undefined;
      }

      const item: EventWorkItem = {
        ...base,
        type,
        dates: {
          ...dates,
          scheduled: dates.scheduled
        }
      };
      return item;
    }

    return {
      ...base,
      type
    };
  }

  private read(
    frontmatter: WorkItemFrontmatter | undefined,
    propertyMap: WorkItemPropertyMap,
    property: WorkItemPropertyKey
  ): unknown {
    return frontmatter?.[propertyMap[property]];
  }

  private invalid(file: TFile, issues: WorkItemValidationIssue[]): WorkItemParseResult {
    return {
      kind: "invalid",
      path: file.path,
      title: file.basename,
      issues
    };
  }
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  return typeof value !== "string" || value.trim().length > 0;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return `'${value}'`;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
