import { TFile, TFolder, normalizePath, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
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

export interface CreateProjectRequest {
  title: string;
  /** Optional destination hint supplied by a folder-scoped OnProgram Base view. */
  targetFolder?: string;
  /** Whether to navigate to the newly created project note. */
  openAfterCreate?: boolean;
}

export interface CreatedProjectResult {
  file: TFile;
  path: string;
  title: string;
}

/** Creates first-class Markdown project work items inside the current Base scope. */
export class ProjectCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => TaskCreationConfig
  ) {}

  async createProject(request: CreateProjectRequest): Promise<CreatedProjectResult> {
    const config = this.getConfig();
    this.assertSafePropertyMap(config.propertyMap);

    const title = normalizeTaskTitle(request.title);
    const folder = this.resolveDestinationFolder(config, request.targetFolder);
    await this.ensureFolder(folder);

    const path = this.findAvailablePath(folder, title);
    const file = await this.app.vault.create(path, "");

    try {
      await this.initializeProjectFrontmatter(file, config.propertyMap);
    } catch (error) {
      try {
        await this.app.vault.delete(file);
      } catch {
        // Preserve the more actionable initialization error.
      }
      throw error;
    }

    if (request.openAfterCreate !== false) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }

    return {
      file,
      path: file.path,
      title: file.basename
    };
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
        "OnProgram could not determine the current Base folder. Focus the Base and try again, or choose Custom vault folder in OnProgram settings.",
        "project-base-folder-unresolved"
      );
    }

    return normalizeTaskFolder(contextualFolder);
  }

  private async initializeProjectFrontmatter(
    file: TFile,
    map: WorkItemPropertyMap
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[map.type] = "project";
      frontmatter[map.status] = DEFAULT_STATUS_BY_TYPE.project;
      setDefault(frontmatter, map.project, null);
      setDefault(frontmatter, map.priority, "normal");
      setDefault(frontmatter, map.start, null);
      setDefault(frontmatter, map.end, null);
      setDefault(frontmatter, map.due, null);
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
          `Cannot create project folder because '${current}' is a file.`,
          "project-folder-conflict"
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
      `Unable to find an available filename for project '${title}'.`,
      "project-filename-exhausted"
    );
  }

  private assertSafePropertyMap(propertyMap: WorkItemPropertyMap): void {
    const issues = validateWorkItemPropertyMap(propertyMap);
    if (issues.length === 0) return;

    throw new OnProgramError(
      `Cannot create a project with the current property mapping: ${issues.map((issue) => issue.message).join(" ")}`,
      "invalid-project-property-map"
    );
  }
}

function setDefault(frontmatter: Record<string, unknown>, property: string, value: unknown): void {
  if (!Object.prototype.hasOwnProperty.call(frontmatter, property)) {
    frontmatter[property] = value;
  }
}
