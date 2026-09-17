import { TFile, TFolder, normalizePath, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import {
  validateWorkItemPropertyMap,
  type WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { DEFAULT_STATUS_BY_TYPE } from "../../models/work-item/WorkItemStatus";
import { resolveOnProgramViewTaskFolder } from "../bases/OnProgramBasePaths";
import {
  normalizeTaskFolder,
  normalizeTaskTitle,
  type TaskCreationConfig
} from "../work-items/TaskCreator";

export interface CreateMilestoneRequest {
  title: string;
  due: WorkItemDateValue;
  project: string;
  targetFolder?: string;
  openAfterCreate?: boolean;
}

export interface CreatedMilestoneResult {
  file: TFile;
  path: string;
  title: string;
}

/** Creates a first-class Markdown milestone linked to a project. */
export class MilestoneCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => TaskCreationConfig
  ) {}

  async createMilestone(request: CreateMilestoneRequest): Promise<CreatedMilestoneResult> {
    const config = this.getConfig();
    this.assertSafePropertyMap(config.propertyMap);

    const title = normalizeTaskTitle(request.title);
    const folder = this.resolveDestinationFolder(config, request.targetFolder);
    await this.ensureFolder(folder);

    const path = this.findAvailablePath(folder, title);
    const file = await this.app.vault.create(path, "");

    try {
      await this.initializeMilestoneFrontmatter(
        file,
        config.propertyMap,
        request.project,
        request.due
      );
    } catch (error) {
      try {
        await this.app.vault.delete(file);
      } catch {
        // Preserve the initialization error.
      }
      throw error;
    }

    if (request.openAfterCreate !== false) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }

    return { file, path: file.path, title: file.basename };
  }

  private resolveDestinationFolder(
    config: TaskCreationConfig,
    targetFolder: string | undefined
  ): string {
    if (config.taskFolderMode === "custom") {
      return normalizeTaskFolder(config.taskFolder);
    }

    const contextualFolder = resolveOnProgramViewTaskFolder(this.app, targetFolder);
    if (!contextualFolder) {
      throw new OnProgramError(
        "OnProgram could not determine the current Base folder for the milestone.",
        "milestone-base-folder-unresolved"
      );
    }

    return normalizeTaskFolder(contextualFolder);
  }

  private async initializeMilestoneFrontmatter(
    file: TFile,
    map: WorkItemPropertyMap,
    project: string,
    due: WorkItemDateValue
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[map.type] = "milestone";
      frontmatter[map.status] = DEFAULT_STATUS_BY_TYPE.milestone;
      frontmatter[map.project] = project;
      frontmatter[map.due] = due.iso;
      setDefault(frontmatter, map.priority, "normal");
      setDefault(frontmatter, map.start, null);
      setDefault(frontmatter, map.end, null);
      setDefault(frontmatter, map.scheduled, null);
      setDefault(frontmatter, map.duration, null);
      setDefault(frontmatter, map.completed, null);
      setDefault(frontmatter, map.parent, null);
      setDefault(frontmatter, map.dependsOn, []);
      setDefault(frontmatter, map.linkedBase, null);
    });
  }

  private async ensureFolder(folder: string): Promise<void> {
    if (!folder) return;

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
          `Cannot create milestone folder because '${current}' is a file.`,
          "milestone-folder-conflict"
        );
      }
    }
  }

  private findAvailablePath(folder: string, title: string): string {
    const makePath = (suffix: string): string =>
      normalizePath(`${folder ? `${folder}/` : ""}${title}${suffix}.md`);

    const first = makePath("");
    if (!this.app.vault.getAbstractFileByPath(first)) return first;

    for (let index = 2; index <= 9999; index += 1) {
      const candidate = makePath(` ${index}`);
      if (!this.app.vault.getAbstractFileByPath(candidate)) return candidate;
    }

    throw new OnProgramError(
      `Unable to find an available filename for milestone '${title}'.`,
      "milestone-filename-exhausted"
    );
  }

  private assertSafePropertyMap(propertyMap: WorkItemPropertyMap): void {
    const issues = validateWorkItemPropertyMap(propertyMap);
    if (issues.length === 0) return;
    throw new OnProgramError(
      `Cannot create a milestone with the current property mapping: ${issues.map((issue) => issue.message).join(" ")}`,
      "invalid-milestone-property-map"
    );
  }
}

function setDefault(frontmatter: Record<string, unknown>, property: string, value: unknown): void {
  if (!Object.prototype.hasOwnProperty.call(frontmatter, property)) {
    frontmatter[property] = value;
  }
}
