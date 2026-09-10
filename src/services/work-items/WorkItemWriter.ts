import { TFile, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { isWorkItemPriority } from "../../models/work-item/WorkItemPriority";
import {
  validateWorkItemPropertyMap,
  type WorkItemPropertyKey,
  type WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import { isWorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { WorkItemType } from "../../models/work-item/WorkItemTypes";
import {
  normalizeWorkItemDate,
  normalizeWorkItemType
} from "./WorkItemValueNormalizer";
import type {
  WorkItemWriteOptions,
  WorkItemWritePatch,
  WorkItemWriteResult
} from "./WorkItemWritePatch";

const DELETE_PROPERTY = Symbol("onprogram-delete-property");
type SerializedPatchValue = string | number | string[] | typeof DELETE_PROPERTY;
type Frontmatter = Record<string, unknown>;

export class WorkItemWriter {
  private readonly writeChains = new Map<string, Promise<void>>();

  constructor(
    private readonly app: App,
    private readonly getPropertyMap: () => WorkItemPropertyMap
  ) {}

  async updateItem(item: WorkItem, patch: WorkItemWritePatch): Promise<WorkItemWriteResult> {
    const abstractFile = this.app.vault.getAbstractFileByPath(item.source.path);
    if (!(abstractFile instanceof TFile)) {
      throw new OnProgramError(
        `Backing Markdown file no longer exists: ${item.source.path}`,
        "work-item-file-not-found"
      );
    }

    return this.updateFile(abstractFile, patch, {
      expectedMtime: item.source.mtime
    });
  }

  async updateFile(
    file: TFile,
    patch: WorkItemWritePatch,
    options: WorkItemWriteOptions = {}
  ): Promise<WorkItemWriteResult> {
    return this.enqueue(file.path, async () => {
      const propertyMap = this.getPropertyMap();
      this.assertSafePropertyMap(propertyMap);

      if (options.expectedMtime !== undefined && file.stat.mtime !== options.expectedMtime) {
        throw new OnProgramError(
          `The file changed after OnProgram read it. Reload the work item before writing: ${file.path}`,
          "work-item-write-conflict"
        );
      }

      const beforeMtime = file.stat.mtime;
      const changed = new Set<WorkItemPropertyKey>();

      await this.app.fileManager.processFrontMatter(file, (rawFrontmatter) => {
        const frontmatter = rawFrontmatter as Frontmatter;
        const type = this.getCurrentType(frontmatter, propertyMap, file.path);
        this.validatePatch(patch, type);
        this.applyPatch(frontmatter, propertyMap, patch, changed);
      });

      return {
        path: file.path,
        changedProperties: [...changed],
        beforeMtime,
        afterMtime: file.stat.mtime
      };
    });
  }

  async completeItem(
    item: WorkItem,
    completedAt: WorkItemDateValue = currentLocalDateTime()
  ): Promise<WorkItemWriteResult> {
    return this.updateItem(item, {
      status: "done",
      completed: completedAt
    });
  }

  async reopenItem(item: WorkItem): Promise<WorkItemWriteResult> {
    const defaultStatus = getWorkItemTypeSchema(item.type).defaultStatus;
    return this.updateItem(item, {
      status: defaultStatus,
      completed: null
    });
  }

  private applyPatch(
    frontmatter: Frontmatter,
    propertyMap: WorkItemPropertyMap,
    patch: WorkItemWritePatch,
    changed: Set<WorkItemPropertyKey>
  ): void {
    if (patch.status !== undefined) {
      this.setProperty(frontmatter, propertyMap, "status", patch.status, changed);
    }

    if (patch.priority !== undefined) {
      this.setProperty(
        frontmatter,
        propertyMap,
        "priority",
        patch.priority === null ? DELETE_PROPERTY : patch.priority,
        changed
      );
    }

    if (patch.project !== undefined) {
      this.setProperty(
        frontmatter,
        propertyMap,
        "project",
        patch.project === null ? DELETE_PROPERTY : patch.project,
        changed
      );
    }

    if (patch.linkedBase !== undefined) {
      this.setProperty(
        frontmatter,
        propertyMap,
        "linkedBase",
        patch.linkedBase === null ? DELETE_PROPERTY : patch.linkedBase,
        changed
      );
    }

    this.applyDatePatch(frontmatter, propertyMap, "start", patch.start, changed);
    this.applyDatePatch(frontmatter, propertyMap, "end", patch.end, changed);
    this.applyDatePatch(frontmatter, propertyMap, "due", patch.due, changed);
    this.applyDatePatch(frontmatter, propertyMap, "scheduled", patch.scheduled, changed);
    this.applyDatePatch(frontmatter, propertyMap, "completed", patch.completed, changed);

    if (patch.durationMinutes !== undefined) {
      this.setProperty(
        frontmatter,
        propertyMap,
        "duration",
        patch.durationMinutes === null ? DELETE_PROPERTY : patch.durationMinutes,
        changed
      );
    }

    if (patch.parent !== undefined) {
      this.setProperty(
        frontmatter,
        propertyMap,
        "parent",
        patch.parent === null ? DELETE_PROPERTY : patch.parent,
        changed
      );
    }

    if (patch.dependsOn !== undefined) {
      const dependencies = patch.dependsOn === null
        ? []
        : [...new Set(patch.dependsOn)];

      this.setProperty(
        frontmatter,
        propertyMap,
        "dependsOn",
        dependencies.length === 0 ? DELETE_PROPERTY : dependencies,
        changed
      );
    }
  }

  private applyDatePatch(
    frontmatter: Frontmatter,
    propertyMap: WorkItemPropertyMap,
    property: "start" | "end" | "due" | "scheduled" | "completed",
    value: WorkItemDateValue | null | undefined,
    changed: Set<WorkItemPropertyKey>
  ): void {
    if (value === undefined) return;

    this.setProperty(
      frontmatter,
      propertyMap,
      property,
      value === null ? DELETE_PROPERTY : value.iso,
      changed
    );
  }

  private setProperty(
    frontmatter: Frontmatter,
    propertyMap: WorkItemPropertyMap,
    property: WorkItemPropertyKey,
    value: SerializedPatchValue,
    changed: Set<WorkItemPropertyKey>
  ): void {
    const mappedName = propertyMap[property];

    if (value === DELETE_PROPERTY) {
      if (Object.prototype.hasOwnProperty.call(frontmatter, mappedName)) {
        delete frontmatter[mappedName];
        changed.add(property);
      }
      return;
    }

    if (sameFrontmatterValue(frontmatter[mappedName], value)) return;

    frontmatter[mappedName] = value;
    changed.add(property);
  }

  private validatePatch(patch: WorkItemWritePatch, type: WorkItemType): void {
    if (patch.status !== undefined) {
      if (!isWorkItemStatus(patch.status)) {
        throw new OnProgramError("Invalid status in work item patch.", "invalid-work-item-patch");
      }

      const schema = getWorkItemTypeSchema(type);
      if (!schema.allowedStatuses.includes(patch.status)) {
        throw new OnProgramError(
          `Status '${patch.status}' is not allowed for ${type} work items.`,
          "invalid-work-item-status"
        );
      }
    }

    if (patch.priority !== undefined && patch.priority !== null && !isWorkItemPriority(patch.priority)) {
      throw new OnProgramError("Invalid priority in work item patch.", "invalid-work-item-patch");
    }

    this.assertOptionalReference(patch.project, "project");
    this.assertOptionalReference(patch.parent, "parent");
    this.assertOptionalReference(patch.linkedBase, "linkedBase");
    this.assertDateValue(patch.start, "start");
    this.assertDateValue(patch.end, "end");
    this.assertDateValue(patch.due, "due");
    this.assertDateValue(patch.scheduled, "scheduled");
    this.assertDateValue(patch.completed, "completed");

    if (type === "milestone" && patch.due === null) {
      throw new OnProgramError("A milestone must keep a due date.", "required-work-item-property");
    }

    if (type === "event" && patch.scheduled === null) {
      throw new OnProgramError("An event must keep a scheduled date/time.", "required-work-item-property");
    }

    if (
      patch.durationMinutes !== undefined &&
      patch.durationMinutes !== null &&
      (!Number.isFinite(patch.durationMinutes) || patch.durationMinutes <= 0 || !Number.isInteger(patch.durationMinutes))
    ) {
      throw new OnProgramError(
        "Duration must be a positive whole number of minutes.",
        "invalid-work-item-patch"
      );
    }

    if (patch.dependsOn !== undefined && patch.dependsOn !== null) {
      if (!Array.isArray(patch.dependsOn) || patch.dependsOn.some((value) => !isNonEmptyString(value))) {
        throw new OnProgramError(
          "Dependencies must be a list of non-empty string references.",
          "invalid-work-item-patch"
        );
      }
    }
  }

  private assertOptionalReference(
    value: string | null | undefined,
    property: "project" | "parent" | "linkedBase"
  ): void {
    if (value !== undefined && value !== null && !isNonEmptyString(value)) {
      throw new OnProgramError(
        `${property} must be a non-empty string reference or null.`,
        "invalid-work-item-patch"
      );
    }
  }

  private assertDateValue(
    value: WorkItemDateValue | null | undefined,
    property: "start" | "end" | "due" | "scheduled" | "completed"
  ): void {
    if (value === undefined || value === null) return;

    const normalized = normalizeWorkItemDate(value.iso);
    if (!normalized || normalized.kind !== value.kind) {
      throw new OnProgramError(
        `Invalid ${property} date in work item patch.`,
        "invalid-work-item-patch"
      );
    }
  }

  private getCurrentType(
    frontmatter: Frontmatter,
    propertyMap: WorkItemPropertyMap,
    path: string
  ): WorkItemType {
    const type = normalizeWorkItemType(frontmatter[propertyMap.type]);
    if (!type) {
      throw new OnProgramError(
        `Cannot safely write '${path}' because it is not a valid OnProgram work item.`,
        "invalid-work-item-source"
      );
    }

    return type;
  }

  private assertSafePropertyMap(propertyMap: WorkItemPropertyMap): void {
    const issues = validateWorkItemPropertyMap(propertyMap);
    if (issues.length === 0) return;

    throw new OnProgramError(
      `Cannot write with the current property mapping: ${issues.map((issue) => issue.message).join(" ")}`,
      "invalid-work-item-property-map"
    );
  }

  private enqueue<T>(path: string, action: () => Promise<T>): Promise<T> {
    const previous = this.writeChains.get(path) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(action);
    const settled = run.then(() => undefined, () => undefined);

    this.writeChains.set(path, settled);

    return run.finally(() => {
      if (this.writeChains.get(path) === settled) this.writeChains.delete(path);
    });
  }
}

function currentLocalDateTime(): WorkItemDateValue {
  const normalized = normalizeWorkItemDate(new Date());
  if (!normalized) {
    throw new OnProgramError(
      "Unable to create the completion timestamp.",
      "work-item-date-error"
    );
  }

  return normalized;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sameFrontmatterValue(current: unknown, next: string | number | string[]): boolean {
  if (Array.isArray(next)) {
    return Array.isArray(current) &&
      current.length === next.length &&
      current.every((value, index) => value === next[index]);
  }

  return current === next;
}
