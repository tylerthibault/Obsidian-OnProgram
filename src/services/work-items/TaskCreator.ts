import { TFile, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { DEFAULT_STATUS_BY_TYPE, type WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import {
  assertSafeCreationPropertyMap,
  createInitializedMarkdownFile,
  ensureCreationFolder,
  findAvailableMarkdownPath,
  normalizeVaultPath,
  normalizeWorkItemFolder,
  normalizeWorkItemTitle,
  resolveCreationFolder,
  setFrontmatterDefault,
  type WorkItemCreationConfig
} from "./WorkItemCreationSupport";

export type TaskCreationConfig = WorkItemCreationConfig;

export interface TaskInitialDate {
  field: "scheduled" | "due" | "start";
  value: WorkItemDateValue;
}

export interface CreateTaskRequest {
  title: string;
  /** Optional per-task override. Falls back to the configured default project. */
  project?: string;
  /** Optional status override used by contextual creation, such as Board columns. */
  initialStatus?: WorkItemStatus;
  /** Optional destination hint supplied by a folder-scoped OnProgram Base view. */
  targetFolder?: string;
  /** Optional calendar/timeline placement written during initial frontmatter creation. */
  initialDate?: TaskInitialDate;
  /** Whether to navigate to the newly created note. */
  openAfterCreate?: boolean;
}

export interface CreatedTaskResult {
  file: TFile;
  path: string;
  title: string;
  usedTemplate: boolean;
}

const TASK_CREATION_KIND = {
  label: "Task",
  folderConflictCode: "task-folder-conflict",
  filenameExhaustedCode: "task-filename-exhausted",
  invalidPropertyMapCode: "invalid-work-item-property-map"
} as const;

export class TaskCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => TaskCreationConfig
  ) {}

  async createTask(request: CreateTaskRequest): Promise<CreatedTaskResult> {
    const config = this.getConfig();
    assertSafeCreationPropertyMap(config.propertyMap, TASK_CREATION_KIND);

    const title = normalizeTaskTitle(request.title);
    const folder = resolveCreationFolder(
      this.app,
      config,
      request.targetFolder,
      {
        unresolvedMessage:
          "OnProgram could not determine the current Base folder. Focus the Base and try again, or choose Custom vault folder in OnProgram settings.",
        unresolvedCode: "task-base-folder-unresolved"
      }
    );

    await ensureCreationFolder(this.app, folder, TASK_CREATION_KIND);

    const { content, usedTemplate } = await this.loadTemplate(config.taskTemplatePath);
    const path = findAvailableMarkdownPath(
      this.app,
      folder,
      title,
      TASK_CREATION_KIND
    );
    const file = await createInitializedMarkdownFile(
      this.app,
      path,
      content,
      (createdFile) => this.initializeTaskFrontmatter(createdFile, config, request)
    );

    if (request.openAfterCreate !== false) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }

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
      frontmatter[map.type] = "task";
      frontmatter[map.status] = request.initialStatus ?? DEFAULT_STATUS_BY_TYPE.task;

      setFrontmatterDefault(frontmatter, map.project, project || null);
      setFrontmatterDefault(frontmatter, map.priority, "normal");
      setFrontmatterDefault(frontmatter, map.start, null);
      setFrontmatterDefault(frontmatter, map.end, null);
      setFrontmatterDefault(frontmatter, map.due, null);
      setFrontmatterDefault(frontmatter, map.scheduled, null);
      setFrontmatterDefault(frontmatter, map.duration, null);
      setFrontmatterDefault(frontmatter, map.completed, null);
      setFrontmatterDefault(frontmatter, map.parent, null);
      setFrontmatterDefault(frontmatter, map.dependsOn, []);
      setFrontmatterDefault(frontmatter, map.linkedBase, null);

      // Performance metrics remain plain frontmatter so external analytics
      // workflows can update them without depending on the OnProgram writer.
      setFrontmatterDefault(frontmatter, "views_24_hours", null);
      setFrontmatterDefault(frontmatter, "views_1_week", null);
      setFrontmatterDefault(frontmatter, "views_1_month", null);

      if (project) frontmatter[map.project] = project;

      if (request.initialDate) {
        frontmatter[map[request.initialDate.field]] = request.initialDate.value.iso;
      }
    });
  }

  private async loadTemplate(
    templatePath: string
  ): Promise<{ content: string; usedTemplate: boolean }> {
    const trimmed = templatePath.trim();
    if (!trimmed) return { content: "", usedTemplate: false };

    const normalized = normalizeVaultPath(trimmed, "template path");
    const candidates = normalized.toLowerCase().endsWith(".md")
      ? [normalized]
      : [normalized, `${normalized}.md`];

    for (const candidate of candidates) {
      const abstractFile = this.app.vault.getAbstractFileByPath(candidate);
      if (!(abstractFile instanceof TFile)) continue;

      return {
        content: await this.app.vault.read(abstractFile),
        usedTemplate: true
      };
    }

    throw new OnProgramError(
      `Task template was not found: ${trimmed}`,
      "task-template-not-found"
    );
  }
}

export function normalizeTaskTitle(value: string): string {
  return normalizeWorkItemTitle(value, {
    label: "Task",
    emptyCode: "empty-task-title",
    invalidCode: "invalid-task-title"
  });
}

export function normalizeTaskFolder(value: string): string {
  return normalizeWorkItemFolder(value);
}
