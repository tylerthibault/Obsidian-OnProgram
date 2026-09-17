import { Menu, Notice, TFile, type App } from "obsidian";
import { ProjectPickerModal } from "../../components/ProjectPickerModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { ProjectWorkItem, WorkItem } from "../../models/work-item/WorkItem";
import { projectReferenceMatches } from "./ProjectRollup";
import type { WorkItemParser } from "../work-items/WorkItemParser";
import type { WorkItemWriter } from "../work-items/WorkItemWriter";

/**
 * Shared project-assignment behavior for all OnProgram views.
 *
 * Projects are scoped to the same Markdown folder as the work item so a
 * folder-scoped OnProgram Base remains self-contained and project rollups stay
 * consistent with the Base's own data set.
 */
export class ProjectAssignmentService {
  constructor(
    private readonly app: App,
    private readonly parser: WorkItemParser,
    private readonly writer: WorkItemWriter,
    private readonly errorHandler: ErrorHandler
  ) {}

  addProjectMenuItem(menu: Menu, item: WorkItem): void {
    if (item.type === "project") return;

    const projects = this.listProjectsForItem(item);
    const current = this.findCurrentProject(item, projects);
    const label = current?.title ?? (item.project ? displayReference(item.project) : "None");

    menu.addItem((menuItem) => menuItem
      .setTitle(`Project — ${label}…`)
      .setIcon("folder-kanban")
      .onClick(() => this.openPicker(item)));
  }

  addProjectMenuItemForPath(menu: Menu, path: string): WorkItem | undefined {
    const item = this.parsePath(path);
    if (!item || item.type === "project") return item;
    this.addProjectMenuItem(menu, item);
    return item;
  }

  openPicker(item: WorkItem): void {
    if (item.type === "project") return;
    const projects = this.listProjectsForItem(item);

    new ProjectPickerModal(this.app, {
      item,
      projects,
      onSelect: async (project) => {
        await this.assign(item, project);
      },
      onRemove: async () => {
        await this.remove(item);
      },
      onError: (error) => this.errorHandler.handle(error, "assign project", true)
    }).open();
  }

  parsePath(path: string): WorkItem | undefined {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return undefined;
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const parsed = this.parser.parse(file, frontmatter);
    return parsed.kind === "valid" ? parsed.item : undefined;
  }

  listProjectsForItem(item: WorkItem): ProjectWorkItem[] {
    const sourceFile = this.app.vault.getAbstractFileByPath(item.source.path);
    if (!(sourceFile instanceof TFile)) return [];
    const folderPath = sourceFile.parent?.path ?? "";
    const projects: ProjectWorkItem[] = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      if ((file.parent?.path ?? "") !== folderPath) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const parsed = this.parser.parse(file, frontmatter);
      if (parsed.kind === "valid" && parsed.item.type === "project") {
        projects.push(parsed.item);
      }
    }

    return projects.sort((a, b) => a.title.localeCompare(b.title));
  }

  private findCurrentProject(
    item: WorkItem,
    projects: readonly ProjectWorkItem[]
  ): ProjectWorkItem | undefined {
    if (!item.project) return undefined;
    return projects.find((project) => projectReferenceMatches(item.project ?? "", project));
  }

  private async assign(item: WorkItem, project: ProjectWorkItem): Promise<void> {
    const reference = projectReference(project);
    await this.writer.updateItem(item, { project: reference });
    new Notice(`OnProgram: assigned ${item.title} to ${project.title}.`);
  }

  private async remove(item: WorkItem): Promise<void> {
    await this.writer.updateItem(item, { project: null });
    new Notice(`OnProgram: removed ${item.title} from its project.`);
  }
}

function projectReference(project: ProjectWorkItem): string {
  return `[[${project.source.path.replace(/\.md$/i, "")}]]`;
}

function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}
