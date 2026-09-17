import { BasesView, Menu, Notice, type QueryController } from "obsidian";
import { CreateProjectModal } from "../../components/CreateProjectModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { ProjectWorkItem } from "../../models/work-item/WorkItem";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import { resolveLinkedOnProgramBase } from "../../services/bases/LinkedOnProgramBase";
import type { ProjectCreator } from "../../services/projects/ProjectCreator";
import { calculateProjectProgress } from "../../services/projects/ProjectRollup";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";

export const ONPROGRAM_PROJECTS_VIEW_ID = "onprogram-projects";

type ProjectFilter = "all" | "active" | "archived";

const INACTIVE_PROJECT_STATUSES = new Set<WorkItemStatus>([
  "done",
  "cancelled",
  "archived"
]);

export class OnProgramProjectsView extends BasesView {
  type = ONPROGRAM_PROJECTS_VIEW_ID;
  private filter: ProjectFilter = "all";
  private writing = false;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly projectCreator: ProjectCreator,
    private readonly writer: WorkItemWriter,
    private readonly workItemOpener: WorkItemOpener,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-projects-view");

    const style = this.hostEl.createEl("style");
    style.textContent = PROJECT_STYLES;

    const result = this.adapter.adapt(this.data);
    const projects = result.items.filter(
      (item): item is ProjectWorkItem => item.type === "project"
    );
    const visibleProjects = projects.filter((project) => this.matchesFilter(project));

    const header = this.hostEl.createDiv({ cls: "onprogram-projects-header" });
    const titleGroup = header.createDiv({ cls: "onprogram-projects-title-group" });
    titleGroup.createEl("h3", { text: "Projects" });
    titleGroup.createSpan({
      text: `${projects.length} ${projects.length === 1 ? "project" : "projects"}`,
      cls: "onprogram-projects-count"
    });

    const createButton = header.createEl("button", {
      text: "+ New project",
      cls: "mod-cta"
    });
    createButton.addEventListener("click", () => this.createProject());

    this.renderFilters();

    if (projects.length === 0) {
      const empty = this.hostEl.createDiv({ cls: "onprogram-projects-empty" });
      empty.createEl("strong", { text: "No projects yet" });
      empty.createDiv({
        text: "Create a project, then assign tasks with the project property to see automatic progress here."
      });
      const emptyCreate = empty.createEl("button", { text: "Create first project" });
      emptyCreate.addEventListener("click", () => this.createProject());
      return;
    }

    if (visibleProjects.length === 0) {
      this.hostEl.createDiv({
        text: `No ${this.filter} projects in this Base.`,
        cls: "onprogram-projects-empty-filter"
      });
      return;
    }

    const list = this.hostEl.createDiv({ cls: "onprogram-projects-list" });
    for (const project of visibleProjects) {
      this.renderProjectRow(list, project, result.items);
    }
  }

  private renderFilters(): void {
    const filters = this.hostEl.createDiv({ cls: "onprogram-projects-filters" });

    for (const filter of ["all", "active", "archived"] as const) {
      const button = filters.createEl("button", {
        text: humanize(filter),
        cls: "onprogram-projects-filter"
      });
      if (this.filter === filter) button.addClass("is-active");
      button.addEventListener("click", () => {
        this.filter = filter;
        this.render();
      });
    }
  }

  private renderProjectRow(
    list: HTMLElement,
    project: ProjectWorkItem,
    allItems: ReturnType<BasesWorkItemAdapter["adapt"]>["items"]
  ): void {
    const progress = calculateProjectProgress(project, allItems);
    const row = list.createDiv({ cls: "onprogram-project-row" });
    row.dataset.path = project.source.path;
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showProjectMenu(event, project);
    });

    const identity = row.createDiv({ cls: "onprogram-project-identity" });
    const titleButton = identity.createEl("button", {
      text: project.title,
      cls: "onprogram-project-title"
    });
    titleButton.addEventListener("click", () => this.openProject(project.source.path));

    const meta = identity.createDiv({ cls: "onprogram-project-meta" });
    meta.createSpan({
      text: humanize(project.status),
      cls: `onprogram-project-status onprogram-project-status-${project.status}`
    });
    meta.createSpan({ text: humanize(project.priority) });
    if (project.dates.due) {
      meta.createSpan({ text: `Due ${formatDate(project.dates.due.iso)}` });
    }

    const progressArea = row.createDiv({ cls: "onprogram-project-progress" });
    const progressTop = progressArea.createDiv({ cls: "onprogram-project-progress-top" });
    progressTop.createSpan({ text: "Progress" });
    progressTop.createSpan({
      text: progress.total === 0
        ? "No tasks"
        : `${progress.completed} / ${progress.total}`,
      cls: "onprogram-project-progress-count"
    });

    const track = progressArea.createDiv({ cls: "onprogram-project-progress-track" });
    const fill = track.createDiv({ cls: "onprogram-project-progress-fill" });
    fill.style.width = `${progress.percentage}%`;
    track.setAttr("aria-label", `${progress.percentage}% complete`);

    const actions = row.createDiv({ cls: "onprogram-project-actions" });
    if (project.linkedBase) {
      const baseButton = actions.createEl("button", {
        text: "Base ↗",
        cls: "onprogram-project-base-button"
      });
      baseButton.setAttr("title", `Open linked OnProgram Base: ${project.linkedBase}`);
      baseButton.addEventListener("click", () => void this.openLinkedBase(project.linkedBase));
    }

    const more = actions.createEl("button", {
      text: "⋯",
      cls: "onprogram-project-more"
    });
    more.setAttr("aria-label", `Project actions for ${project.title}`);
    more.addEventListener("click", (event) => this.showProjectMenu(event, project));
  }

  private matchesFilter(project: ProjectWorkItem): boolean {
    if (this.filter === "all") return true;
    if (this.filter === "archived") return project.status === "archived";
    return !INACTIVE_PROJECT_STATUSES.has(project.status);
  }

  private createProject(): void {
    new CreateProjectModal(this.app, {
      onSubmit: async (title) => {
        const created = await this.projectCreator.createProject({
          title,
          targetFolder: this.getConfiguredTaskFolder(),
          openAfterCreate: false
        });
        new Notice(`OnProgram: Created project ${created.title}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "create project", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private openProject(path: string): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === path);
    if (entry) void this.workItemOpener.open(entry.file);
  }

  private async openLinkedBase(reference: string | undefined): Promise<void> {
    const baseFile = resolveLinkedOnProgramBase(this.app, reference);
    if (!baseFile) {
      new Notice(`OnProgram: Linked Base was not found${reference ? `: ${reference}` : "."}`);
      return;
    }
    await this.app.workspace.getLeaf(false).openFile(baseFile);
  }

  private showProjectMenu(event: MouseEvent, project: ProjectWorkItem): void {
    const menu = new Menu();

    menu.addItem((item) => item
      .setTitle("Open project note")
      .setIcon("file-text")
      .onClick(() => this.openProject(project.source.path)));

    if (project.linkedBase) {
      menu.addItem((item) => item
        .setTitle("Open linked OnProgram Base")
        .setIcon("layout-dashboard")
        .onClick(() => void this.openLinkedBase(project.linkedBase)));
    }

    menu.addSeparator();
    menu.addItem((item) => {
      item.setTitle(`Status — ${humanize(project.status)}`).setIcon("circle-dot");
      const submenu = (item as unknown as { setSubmenu(): Menu }).setSubmenu();
      const schema = getWorkItemTypeSchema("project");
      for (const status of schema.allowedStatuses) {
        submenu.addItem((subItem) => subItem
          .setTitle(humanize(status))
          .setIcon(status === project.status ? "check" : "circle")
          .onClick(() => void this.setProjectStatus(project, status)));
      }
    });

    menu.showAtMouseEvent(event);
  }

  private async setProjectStatus(
    project: ProjectWorkItem,
    status: WorkItemStatus
  ): Promise<void> {
    if (this.writing || project.status === status) return;
    this.writing = true;
    this.hostEl.addClass("onprogram-is-busy");

    try {
      await this.writer.updateItem(project, { status });
      new Notice(`OnProgram: ${project.title} marked ${humanize(status)}.`);
    } catch (error) {
      this.errorHandler.handle(error, "change project status", true);
    } finally {
      this.writing = false;
      this.hostEl.removeClass("onprogram-is-busy");
    }
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return value;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const PROJECT_STYLES = `
.onprogram-projects-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--size-4-4);
}

.onprogram-projects-header,
.onprogram-projects-title-group,
.onprogram-projects-filters,
.onprogram-project-row,
.onprogram-project-meta,
.onprogram-project-progress-top,
.onprogram-project-actions {
  display: flex;
  align-items: center;
}

.onprogram-projects-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}

.onprogram-projects-title-group {
  gap: var(--size-4-2);
}

.onprogram-projects-title-group h3 {
  margin: 0;
}

.onprogram-projects-count,
.onprogram-project-meta,
.onprogram-project-progress-top {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-projects-filters {
  gap: var(--size-4-1);
  margin-bottom: var(--size-4-3);
}

.onprogram-projects-filter.is-active {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.onprogram-projects-list {
  display: grid;
  gap: var(--size-4-2);
}

.onprogram-project-row {
  gap: var(--size-4-4);
  min-height: 72px;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
}

.onprogram-project-row:hover {
  background: var(--background-modifier-hover);
  border-color: var(--background-modifier-border-hover);
}

.onprogram-project-identity {
  flex: 1 1 34%;
  min-width: 180px;
}

.onprogram-project-title {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-normal);
  text-align: left;
  font-weight: var(--font-semibold);
  font-size: var(--font-ui-medium);
}

.onprogram-project-meta {
  gap: var(--size-4-1);
  flex-wrap: wrap;
  margin-top: 5px;
}

.onprogram-project-meta span {
  padding: 1px 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
}

.onprogram-project-status-in-progress {
  color: var(--color-blue);
  border-color: var(--color-blue) !important;
}

.onprogram-project-status-done {
  color: var(--color-green);
  border-color: var(--color-green) !important;
}

.onprogram-project-status-blocked {
  color: var(--color-red);
  border-color: var(--color-red) !important;
}

.onprogram-project-progress {
  flex: 1 1 42%;
  min-width: 180px;
}

.onprogram-project-progress-top {
  justify-content: space-between;
  gap: var(--size-4-2);
  margin-bottom: 6px;
}

.onprogram-project-progress-count {
  font-variant-numeric: tabular-nums;
}

.onprogram-project-progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}

.onprogram-project-progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--interactive-accent);
  transition: width 160ms ease;
}

.onprogram-project-actions {
  justify-content: flex-end;
  gap: var(--size-4-1);
  flex: 0 0 auto;
}

.onprogram-project-base-button,
.onprogram-project-more {
  white-space: nowrap;
}

.onprogram-projects-empty,
.onprogram-projects-empty-filter {
  padding: var(--size-4-8) var(--size-4-4);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
  text-align: center;
}

.onprogram-projects-empty strong {
  display: block;
  margin-bottom: var(--size-4-2);
  color: var(--text-normal);
  font-size: var(--font-ui-medium);
}

.onprogram-projects-empty button {
  margin-top: var(--size-4-3);
}

@media (max-width: 760px) {
  .onprogram-project-row {
    align-items: stretch;
    flex-direction: column;
  }

  .onprogram-project-identity,
  .onprogram-project-progress {
    min-width: 0;
    width: 100%;
  }

  .onprogram-project-actions {
    justify-content: flex-start;
  }
}
`;
