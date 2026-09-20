import { TFile, type App } from "obsidian";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
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

const MILESTONE_CREATION_KIND = {
  label: "Milestone",
  folderConflictCode: "milestone-folder-conflict",
  filenameExhaustedCode: "milestone-filename-exhausted",
  invalidPropertyMapCode: "invalid-milestone-property-map"
} as const;

/** Creates a first-class Markdown milestone linked to a project. */
export class MilestoneCreator {
  constructor(
    private readonly app: App,
    private readonly getConfig: () => WorkItemCreationConfig
  ) {}

  async createMilestone(
    request: CreateMilestoneRequest
  ): Promise<CreatedMilestoneResult> {
    const config = this.getConfig();
    assertSafeCreationPropertyMap(config.propertyMap, MILESTONE_CREATION_KIND);

    const title = normalizeWorkItemTitle(request.title, {
      label: "Milestone",
      emptyCode: "empty-milestone-title",
      invalidCode: "invalid-milestone-title"
    });
    const folder = resolveCreationFolder(
      this.app,
      config,
      request.targetFolder,
      {
        unresolvedMessage:
          "OnProgram could not determine the current Base folder for the milestone.",
        unresolvedCode: "milestone-base-folder-unresolved"
      }
    );

    await ensureCreationFolder(this.app, folder, MILESTONE_CREATION_KIND);

    const path = findAvailableMarkdownPath(
      this.app,
      folder,
      title,
      MILESTONE_CREATION_KIND
    );
    const file = await createInitializedMarkdownFile(
      this.app,
      path,
      "",
      (createdFile) =>
        this.initializeMilestoneFrontmatter(
          createdFile,
          config.propertyMap,
          request.project,
          request.due
        )
    );

    if (request.openAfterCreate !== false) {
      await this.app.workspace.getLeaf(false).openFile(file);
    }

    return { file, path: file.path, title: file.basename };
  }

  private async initializeMilestoneFrontmatter(
    file: TFile,
    map: WorkItemCreationConfig["propertyMap"],
    project: string,
    due: WorkItemDateValue
  ): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[map.type] = "milestone";
      frontmatter[map.status] = DEFAULT_STATUS_BY_TYPE.milestone;
      frontmatter[map.project] = project;
      frontmatter[map.due] = due.iso;

      setFrontmatterDefault(frontmatter, map.priority, "normal");
      setFrontmatterDefault(frontmatter, map.start, null);
      setFrontmatterDefault(frontmatter, map.end, null);
      setFrontmatterDefault(frontmatter, map.scheduled, null);
      setFrontmatterDefault(frontmatter, map.duration, null);
      setFrontmatterDefault(frontmatter, map.completed, null);
      setFrontmatterDefault(frontmatter, map.parent, null);
      setFrontmatterDefault(frontmatter, map.dependsOn, []);
      setFrontmatterDefault(frontmatter, map.linkedBase, null);
    });
  }
}
