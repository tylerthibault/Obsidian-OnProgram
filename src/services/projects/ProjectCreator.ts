import { TFile, type App } from "obsidian";
import { DEFAULT_STATUS_BY_TYPE } from "../../models/work-item/WorkItemStatus";
import {
  assertSafeCreationPropertyMap,
  createInitializedMarkdownFile,
  ensureCreationFolder,
  findAvailableMarkdownPath,
  normalizeWorkItemTitle,
  resolveCreationFolder,
  setFrontmatterDefault,
  type WorkItemCreationConfig
} from "../work-items/WorkItemCreationSupport";

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

const PROJECT_CREATION_KIND = {
  label: "Project",
  folderConflictCode: "project-folder-conflict",
  filenameExhaustedCode: "project-filename-exhausted",
  invalidPropertyMapCode: "invalid-project-property-map"
} as const;

/** Creates first-class Markdown project work items inside the current Base scope. */
export class ProjectCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => WorkItemCreationConfig
  ) {}

  async createProject(request: CreateProjectRequest): Promise<CreatedProjectResult> {
    const config = this.getConfig();
    assertSafeCreationPropertyMap(config.propertyMap, PROJECT_CREATION_KIND);

    const title = normalizeWorkItemTitle(request.title, {
      label: "Project",
      emptyCode: "empty-project-title",
      invalidCode: "invalid-project-title"
    });
    const folder = resolveCreationFolder(
      this.app,
      config,
      request.targetFolder,
      {
        unresolvedMessage:
          "OnProgram could not determine the current Base folder. Focus the Base and try again, or choose Custom vault folder in OnProgram settings.",
        unresolvedCode: "project-base-folder-unresolved"
      }
    );

    await ensureCreationFolder(this.app, folder, PROJECT_CREATION_KIND);

    const path = findAvailableMarkdownPath(
      this.app,
      folder,
      title,
      PROJECT_CREATION_KIND
    );
    const file = await createInitializedMarkdownFile(
      this.app,
      path,
      "",
      (createdFile) =>
        this.initializeProjectFrontmatter(createdFile, config.propertyMap)
    );

    if (request.openAfterCreate !== false) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }

    return {
      file,
      path: file.path,
      title: file.basename
    };
  }

  private async initializeProjectFrontmatter(
    file: TFile,
    map: WorkItemCreationConfig["propertyMap"]
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[map.type] = "project";
      frontmatter[map.status] = DEFAULT_STATUS_BY_TYPE.project;

      setFrontmatterDefault(frontmatter, map.project, null);
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
    });
  }
}
