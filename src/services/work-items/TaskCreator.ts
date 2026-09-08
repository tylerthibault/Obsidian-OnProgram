import { TFile, TFolder, normalizePath, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import {
  validateWorkItemPropertyMap,
  type WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { DEFAULT_STATUS_BY_TYPE } from "../../models/work-item/WorkItemStatus";

export interface TaskCreationConfig {
  taskFolder: string;
  taskTemplatePath: string;
  defaultProject: string;
  propertyMap: WorkItemPropertyMap;
}

export interface TaskInitialDate {
  field: "scheduled" | "due" | "start";
  value: WorkItemDateValue;
}

export interface CreateTaskRequest {
  title: string;
  /** Optional per-task override. Falls back to the configured default project. */
  project?: string;
  /**
   * Optional destination override used by folder-scoped OnProgram Bases.
   * Falls back to the global task-folder setting when omitted.
   */
  targetFolder?: string;
  /** Optional calendar placement written during initial frontmatter creation. */
  initialDate?: TaskInitialDate;
}

export interface CreatedTaskResult {
  file: TFile;
  path: string;
  title: string;
  usedTemplate: boolean;
}

export class TaskCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => TaskCreationConfig
  ) {}

  async createTask(request: CreateTaskRequest): Promise<CreatedTaskResult> {
    const config = this.getConfig();
    this.assertSafePropertyMap(config.propertyMap);

    const title = normalizeTaskTitle(request.title);
    const folder = normalizeTaskFolder(request.targetFolder ?? config.taskFolder);
    await this.ensureFolder(folder);

    const { content, usedTemplate } = await this.loadTemplate(config.taskTemplatePath);
    const path = this.findAvailablePath(folder, title);
    const file = await this.app.vault.create(path, content);

    try {
      await this.initializeTaskFrontmatter(file, config, request);
    } catch (error) {
      try {
        await this.app.vault.delete(file);
      } catch {
        // The initialization error is more actionable than a secondary cleanup failure.
      }
      throw error;
    }

    await this.app.workspace.getLeaf(false).openFile(file);

    return {
      file,
      path: file.path,
      title: file.basename,
      usedTemplate
    };
  }

  private async initializeTaskFrontmatter(
    file: TFile,
    config: TaskCreationConfig,
    request: CreateTaskRequest
  ): Promise<void> {
    const projectOverride = request.project?.trim();
    const defaultProject = config.defaultProject.trim();
    const project = projectOverride || defaultProject;
    const map = config.propertyMap;

    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      // Type is canonical for every file created through TaskCreator.
      frontmatter[map.type] = "task";

      // Populate the complete OnProgram schema once. This means a task can move
      // between Board, Calendar, Timeline, and future views without requiring a
      // later migration just to add missing properties.
      setDefault(frontmatter, map.status, DEFAULT_STATUS_BY_TYPE.task);
      setDefault(frontmatter, map.project, project || null);
      setDefault(frontmatter, map.priority, "normal");
      setDefault(frontmatter, map.start, null);
      setDefault(frontmatter, map.end, null);
      setDefault(frontmatter, map.due, null);
      setDefault(frontmatter, map.scheduled, null);
      setDefault(frontmatter, map.duration, null);
      setDefault(frontmatter, map.completed, null);
      setDefault(frontmatter, map.parent, null);
      setDefault(frontmatter, map.dependsOn, []);

      if (project) {
        // Explicit/default project configuration should win over a blank template value.
        frontmatter[map.project] = project;
      }

      if (request.initialDate) {
        frontmatter[map[request.initialDate.field]] = request.initialDate.value.iso;
      }
    });
  }

  private async loadTemplate(templatePath: string): Promise<{ content: string; usedTemplate: boolean }> {
    const trimmed = templatePath.trim();
    if (!trimmed) {
      return { content: "", usedTemplate: false };
    }

    const normalized = normalizeVaultPath(trimmed, "template path");
    const candidates = normalized.toLowerCase().endsWith(".md")
      ? [normalized]
      : [normalized, `${normalized}.md`];

    for (const candidate of candidates) {
      const abstractFile = this.app.vault.getAbstractFileByPath(candidate);
      if (abstractFile instanceof TFile) {
        return {
          content: await this.app.vault.read(abstractFile),
          usedTemplate: true
        };
      }
    }

    throw new OnProgramError(
      `Task template was not found: ${trimmed}`,
      "task-template-not-found"
    );
  }

  private async ensureFolder(folder: string): Promise<void> {
    if (!folder) {
      return;
    }

    const segments = folder.split("/").filter((segment) => segment.length > 0);
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(current);

      if (!existing) {
        await this.app.vault.createFolder(current);
        continue;
      }

      if (!(existing instanceof TFolder)) {
        throw new OnProgramError(
          `Cannot create task folder because '${current}' is a file.`,
          "task-folder-conflict"
        );
      }
    }
  }

  private findAvailablePath(folder: string, title: string): string {
    const makePath = (suffix: string): string =>
      normalizePath(`${folder ? `${folder}/` : ""}${title}${suffix}.md`);

    const first = makePath("");
    if (!this.app.vault.getAbstractFileByPath(first)) {
      return first;
    }

    for (let index = 2; index <= 9999; index += 1) {
      const candidate = makePath(` ${index}`);
      if (!this.app.vault.getAbstractFileByPath(candidate)) {
        return candidate;
      }
    }

    throw new OnProgramError(
      `Unable to find an available filename for '${title}'.`,
      "task-filename-exhausted"
    );
  }

  private assertSafePropertyMap(propertyMap: WorkItemPropertyMap): void {
    const issues = validateWorkItemPropertyMap(propertyMap);
    if (issues.length === 0) {
      return;
    }

    throw new OnProgramError(
      `Cannot create a task with the current property mapping: ${issues.map((issue) => issue.message).join(" ")}`,
      "invalid-work-item-property-map"
    );
  }
}

export function normalizeTaskTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new OnProgramError("Task title cannot be empty.", "empty-task-title");
  }

  const sanitized = trimmed
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!sanitized) {
    throw new OnProgramError("Task title does not contain a usable filename.", "invalid-task-title");
  }

  return sanitized;
}

export function normalizeTaskFolder(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return normalizeVaultPath(trimmed, "task folder");
}

function normalizeVaultPath(value: string, label: string): string {
  const slashNormalized = value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = slashNormalized.split("/").filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new OnProgramError(
      `The ${label} cannot contain '.' or '..' path segments.`,
      "invalid-vault-path"
    );
  }

  if (segments.length === 0) {
    return "";
  }

  return normalizePath(segments.join("/"));
}

function setDefault(frontmatter: Record<string, unknown>, property: string, value: unknown): void {
  if (!Object.prototype.hasOwnProperty.call(frontmatter, property)) {
    frontmatter[property] = value;
  }
}
