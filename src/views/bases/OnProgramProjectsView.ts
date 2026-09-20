import { BasesView, Menu, Notice, TFile, type QueryController } from "obsidian";
import { localDateIso } from "../../utils/dateTime";
import { humanize } from "../../utils/text";
import { CreateMilestoneModal } from "../../components/CreateMilestoneModal";
import { CreateProjectModal } from "../../components/CreateProjectModal";
import { ProjectTaskManagerModal } from "../../components/ProjectTaskManagerModal";
import { QuickTaskEditorModal } from "../../components/QuickTaskEditorModal";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type {
  MilestoneWorkItem,
  ProjectWorkItem,
  TaskWorkItem,
  WorkItem
} from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import { WORK_ITEM_PRIORITY_RANK } from "../../models/work-item/WorkItemPriority";
import { getWorkItemTypeSchema } from "../../models/work-item/WorkItemSchema";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import { resolveLinkedOnProgramBase } from "../../services/bases/LinkedOnProgramBase";
import type { MilestoneCreator } from "../../services/projects/MilestoneCreator";
import type { ProjectCreator } from "../../services/projects/ProjectCreator";
import {
  calculateProjectProgress,
  getLinkedProjectTasks,
  isProjectTaskComplete,
  isProjectTaskExcluded,
  projectReferenceMatches
} from "../../services/projects/ProjectRollup";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemEditorService } from "../../services/work-items/WorkItemEditorService";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
import type { WorkItemWriter } from "../../services/work-items/WorkItemWriter";

export const ONPROGRAM_PROJECTS_VIEW_ID = "onprogram-projects";

type ProjectFilter = "all" | "active" | "archived";
type ProjectItems = ReturnType<BasesWorkItemAdapter["adapt"]>["items"];

const INACTIVE_PROJECT_STATUSES = new Set<WorkItemStatus>([
  "done",
  "cancelled",
  "archived"
]);
const BLOCKED_TASK_STATUSES = new Set<WorkItemStatus>(["blocked", "waiting"]);
const CHECKBOX_LOCKED_STATUSES = new Set<WorkItemStatus>(["posted", "cancelled", "archived"]);
const UP_NEXT_STATUSES = new Set<WorkItemStatus>(["inbox", "todo", "planned", "scheduled"]);

export class OnProgramProjectsView extends BasesView {
  type = ONPROGRAM_PROJECTS_VIEW_ID;
  private filter: ProjectFilter = "all";
  private selectedProjectPath?: string;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly projectCreator: ProjectCreator,
    private readonly milestoneCreator: MilestoneCreator,
    private readonly taskCreator: TaskCreator,
    private readonly writer: WorkItemWriter,
    private readonly workItemEditor: WorkItemEditorService,
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

    if (this.selectedProjectPath) {
      const selected = projects.find((project) => project.source.path === this.selectedProjectPath);
      if (selected) {
        this.renderProjectDetail(selected, result.items);
        return;
      }
      this.selectedProjectPath = undefined;
    }

    this.renderProjectIndex(projects, result.items);
  }

  private renderProjectIndex(projects: ProjectWorkItem[], allItems: ProjectItems): void {
    const visibleProjects = projects.filter((project) => this.matchesFilter(project));
    const shell = this.hostEl.createDiv({ cls: "onprogram-projects-index-shell" });

    const header = shell.createDiv({ cls: "onprogram-projects-header" });
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

    this.renderFilters(shell);

    if (projects.length === 0) {
      const empty = shell.createDiv({ cls: "onprogram-projects-empty" });
      empty.createEl("strong", { text: "No projects yet" });
      empty.createDiv({
        text: "Create a project, then add work as you discover it. OnProgram will summarize whatever is currently linked without assuming you already know the final task count."
      });
      const emptyCreate = empty.createEl("button", { text: "Create first project" });
      emptyCreate.addEventListener("click", () => this.createProject());
      return;
    }

    if (visibleProjects.length === 0) {
      shell.createDiv({
        text: `No ${this.filter} projects in this Base.`,
        cls: "onprogram-projects-empty-filter"
      });
      return;
    }

    const list = shell.createDiv({ cls: "onprogram-projects-list" });
    for (const project of visibleProjects) {
      this.renderProjectRow(list, project, allItems);
    }
  }

  private renderFilters(parent: HTMLElement): void {
    const filters = parent.createDiv({ cls: "onprogram-projects-filters" });

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
    allItems: ProjectItems
  ): void {
    const progress = calculateProjectProgress(project, allItems);
    const linkedTasks = getLinkedProjectTasks(project, allItems);
    const health = getProjectHealth(linkedTasks);
    const row = list.createDiv({ cls: "onprogram-project-row" });
    row.dataset.path = project.source.path;
    row.setAttr("role", "button");
    row.setAttr("tabindex", "0");
    row.setAttr("aria-label", `Open project ${project.title}`);
    row.addEventListener("click", (event) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      this.selectProject(project);
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.selectProject(project);
    });
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showProjectMenu(event, project, allItems);
    });

    const identity = row.createDiv({ cls: "onprogram-project-identity" });
    const titleButton = identity.createEl("button", {
      text: project.title,
      cls: "onprogram-project-title"
    });
    titleButton.addEventListener("click", () => this.selectProject(project));

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
    progressTop.createSpan({ text: "Current linked work" });
    progressTop.createSpan({
      text: progress.total === 0
        ? "No tasks"
        : `${progress.completed} / ${progress.total}`,
      cls: "onprogram-project-progress-count"
    });

    const track = progressArea.createDiv({ cls: "onprogram-project-progress-track" });
    const fill = track.createDiv({ cls: "onprogram-project-progress-fill" });
    fill.style.width = `${progress.percentage}%`;
    track.setAttr("aria-label", `${progress.percentage}% of currently linked work complete`);

    const rollup = progressArea.createDiv({ cls: "onprogram-project-row-rollup" });
    rollup.createSpan({ text: `${health.remaining} remaining` });
    if (health.blocked > 0) rollup.createSpan({ text: `${health.blocked} blocked/waiting` });
    if (health.overdue > 0) rollup.createSpan({ text: `${health.overdue} overdue` });

    const actions = row.createDiv({ cls: "onprogram-project-actions" });
    const tasksButton = actions.createEl("button", {
      text: progress.total === 0 ? "Tasks" : `Tasks ${progress.total}`,
      cls: "onprogram-project-tasks-button"
    });
    tasksButton.setAttr("title", `Manage tasks for ${project.title}`);
    tasksButton.addEventListener("click", () => this.openTaskManager(project, allItems));

    const noteButton = actions.createEl("button", { text: "Note" });
    noteButton.setAttr("title", `Open ${project.title} project note`);
    noteButton.addEventListener("click", () => this.openWorkItem(project));

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
    more.addEventListener("click", (event) => this.showProjectMenu(event, project, allItems));
  }

  private renderProjectDetail(project: ProjectWorkItem, allItems: ProjectItems): void {
    const linkedTasks = getLinkedProjectTasks(project, allItems);
    const milestones = getLinkedMilestones(project, allItems);
    const progress = calculateProjectProgress(project, allItems);
    const health = getProjectHealth(linkedTasks);
    const shell = this.hostEl.createDiv({ cls: "onprogram-project-detail" });

    const breadcrumb = shell.createDiv({ cls: "onprogram-project-detail-breadcrumb" });
    const back = breadcrumb.createEl("button", { text: "← Projects" });
    back.addEventListener("click", () => {
      this.selectedProjectPath = undefined;
      this.render();
    });

    const header = shell.createDiv({ cls: "onprogram-project-detail-header" });
    const heading = header.createDiv({ cls: "onprogram-project-detail-heading" });
    heading.createEl("h2", { text: project.title });
    const headingMeta = heading.createDiv({ cls: "onprogram-project-detail-heading-meta" });
    const status = headingMeta.createEl("button", {
      text: humanize(project.status),
      cls: `onprogram-project-status onprogram-project-status-${project.status}`
    });
    status.addEventListener("click", (event) => this.showStatusMenu(event, project));
    headingMeta.createSpan({ text: `${humanize(project.priority)} priority` });
    if (project.dates.due) {
      headingMeta.createSpan({ text: `Due ${formatDate(project.dates.due.iso)}` });
    }

    const headerActions = header.createDiv({ cls: "onprogram-project-detail-actions" });
    const manage = headerActions.createEl("button", { text: "Manage tasks" });
    manage.addEventListener("click", () => this.openTaskManager(project, allItems));
    const edit = headerActions.createEl("button", { text: "Edit project" });
    edit.addEventListener("click", () => this.openEditor(project));
    const note = headerActions.createEl("button", { text: "Open note" });
    note.addEventListener("click", () => this.openWorkItem(project));
    if (project.linkedBase) {
      const base = headerActions.createEl("button", { text: "Open Base ↗" });
      base.addEventListener("click", () => void this.openLinkedBase(project.linkedBase));
    }

    this.renderProjectSummary(shell, project, progress, health);
    this.renderNextUp(shell, linkedTasks);
    this.renderTaskWorkspace(shell, project, linkedTasks, allItems);
    this.renderSchedule(shell, linkedTasks);
    this.renderMilestones(shell, project, milestones);
    this.renderProjectNotes(shell, project);
    this.renderProjectDetails(shell, project);
  }

  private renderProjectSummary(
    parent: HTMLElement,
    project: ProjectWorkItem,
    progress: ReturnType<typeof calculateProjectProgress>,
    health: ProjectHealth
  ): void {
    const section = parent.createDiv({ cls: "onprogram-project-summary" });
    const progressCard = section.createDiv({ cls: "onprogram-project-summary-progress" });
    const progressHeader = progressCard.createDiv({ cls: "onprogram-project-summary-progress-header" });
    progressHeader.createDiv({ text: "Current linked work", cls: "onprogram-project-eyebrow" });
    progressHeader.createEl("strong", {
      text: progress.total === 0 ? "No linked tasks yet" : `${progress.completed} of ${progress.total} complete`
    });
    const track = progressCard.createDiv({ cls: "onprogram-project-detail-progress-track" });
    const fill = track.createDiv({ cls: "onprogram-project-detail-progress-fill" });
    fill.style.width = `${progress.percentage}%`;
    progressCard.createDiv({
      text: "This measures the work currently linked to the project. The total can grow or shrink as you discover more work.",
      cls: "onprogram-project-progress-explainer"
    });

    const stats = section.createDiv({ cls: "onprogram-project-summary-stats" });
    renderMetric(stats, String(health.remaining), "Remaining");
    renderMetric(stats, String(health.blocked), "Blocked / waiting");
    renderMetric(stats, String(health.overdue), "Overdue");
    renderMetric(stats, String(health.scheduled), "Scheduled");

    if (project.dates.start || project.dates.due) {
      const range = section.createDiv({ cls: "onprogram-project-summary-range" });
      if (project.dates.start) {
        range.createSpan({ text: `Starts ${formatDate(project.dates.start.iso)}` });
      }
      if (project.dates.due) {
        range.createSpan({ text: `Due ${formatDate(project.dates.due.iso)}` });
      }
    }
  }

  private renderNextUp(parent: HTMLElement, linkedTasks: TaskWorkItem[]): void {
    const section = createSection(parent, "Next up", "The most relevant open work based on status, dates, and priority.");
    const next = getNextUpTasks(linkedTasks).slice(0, 5);

    if (next.length === 0) {
      section.body.createDiv({
        text: linkedTasks.length === 0
          ? "No work is linked yet. Add a task below or use Manage tasks to attach existing work."
          : "There is no active work to surface right now.",
        cls: "onprogram-project-detail-empty"
      });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-project-next-list" });
    for (const task of next) {
      const row = list.createDiv({ cls: "onprogram-project-next-row" });
      row.createSpan({ text: task.status === "in-progress" ? "◉" : "○", cls: "onprogram-project-next-marker" });
      const title = row.createEl("button", { text: task.title, cls: "onprogram-project-next-title" });
      title.addEventListener("click", () => this.openWorkItem(task));
      const meta = row.createDiv({ cls: "onprogram-project-next-meta" });
      meta.createSpan({ text: humanize(task.status) });
      const date = getTaskDisplayDate(task);
      if (date) meta.createSpan({ text: `${date.label} ${formatDateTime(date.value.iso)}` });
      if (task.priority === "high" || task.priority === "urgent") {
        meta.createSpan({ text: humanize(task.priority) });
      }
    }
  }

  private renderTaskWorkspace(
    parent: HTMLElement,
    project: ProjectWorkItem,
    linkedTasks: TaskWorkItem[],
    allItems: ProjectItems
  ): void {
    const section = createSection(parent, "Tasks", "Work can be added at any time; the list does not need to be known in advance.");
    const controls = section.header.createDiv({ cls: "onprogram-project-section-actions" });
    const manage = controls.createEl("button", { text: "Manage existing" });
    manage.addEventListener("click", () => this.openTaskManager(project, allItems));

    const composer = section.body.createDiv({ cls: "onprogram-project-inline-composer" });
    const input = composer.createEl("input", { type: "text" });
    input.placeholder = "Add a task to this project…";
    const add = composer.createEl("button", { text: "+ Add task", cls: "mod-cta" });
    const create = () => void this.createLinkedTask(project, input);
    add.addEventListener("click", create);
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.shiftKey) return;
      event.preventDefault();
      create();
    });

    if (linkedTasks.length === 0) {
      section.body.createDiv({
        text: "No task files are linked to this project yet.",
        cls: "onprogram-project-detail-empty"
      });
      return;
    }

    const groups = [
      {
        title: "In progress",
        tasks: linkedTasks.filter((task) => task.status === "in-progress")
      },
      {
        title: "Up next",
        tasks: linkedTasks.filter((task) => UP_NEXT_STATUSES.has(task.status))
      },
      {
        title: "Blocked / waiting",
        tasks: linkedTasks.filter((task) => BLOCKED_TASK_STATUSES.has(task.status))
      }
    ];

    for (const group of groups) {
      if (group.tasks.length === 0) continue;
      this.renderTaskGroup(section.body, group.title, sortProjectTasks(group.tasks));
    }

    const completed = linkedTasks.filter((task) => isProjectTaskComplete(task.status));
    if (completed.length > 0) {
      this.renderCollapsibleTaskGroup(section.body, "Completed", sortProjectTasks(completed), false);
    }

    const closed = linkedTasks.filter((task) => isProjectTaskExcluded(task.status));
    if (closed.length > 0) {
      this.renderCollapsibleTaskGroup(section.body, "Cancelled / archived", sortProjectTasks(closed), false);
    }
  }

  private renderTaskGroup(parent: HTMLElement, title: string, tasks: TaskWorkItem[]): void {
    const group = parent.createDiv({ cls: "onprogram-project-task-group" });
    const header = group.createDiv({ cls: "onprogram-project-task-group-header" });
    header.createEl("h4", { text: title });
    header.createSpan({ text: String(tasks.length) });
    const list = group.createDiv({ cls: "onprogram-project-task-list" });
    for (const task of tasks) this.renderTaskRow(list, task);
  }

  private renderCollapsibleTaskGroup(
    parent: HTMLElement,
    title: string,
    tasks: TaskWorkItem[],
    open: boolean
  ): void {
    const details = parent.createEl("details", { cls: "onprogram-project-task-group onprogram-project-task-group-collapsible" });
    details.open = open;
    const summary = details.createEl("summary");
    summary.createSpan({ text: title });
    summary.createSpan({ text: String(tasks.length), cls: "onprogram-project-task-group-count" });
    const list = details.createDiv({ cls: "onprogram-project-task-list" });
    for (const task of tasks) this.renderTaskRow(list, task);
  }

  private renderTaskRow(parent: HTMLElement, task: TaskWorkItem): void {
    const row = parent.createDiv({ cls: "onprogram-project-task-detail-row" });
    const complete = isProjectTaskComplete(task.status);
    const checkbox = row.createEl("input", { type: "checkbox" });
    checkbox.checked = complete;
    checkbox.disabled = CHECKBOX_LOCKED_STATUSES.has(task.status);
    checkbox.setAttr("aria-label", complete ? `Reopen ${task.title}` : `Complete ${task.title}`);
    checkbox.addEventListener("change", () => void this.toggleTaskComplete(task, checkbox.checked));

    const main = row.createDiv({ cls: "onprogram-project-task-detail-main" });
    const title = main.createEl("button", {
      text: task.title,
      cls: `onprogram-project-task-detail-title${complete ? " is-complete" : ""}`
    });
    title.addEventListener("click", () => this.openWorkItem(task));
    const meta = main.createDiv({ cls: "onprogram-project-task-detail-meta" });
    meta.createSpan({ text: humanize(task.status), cls: `is-status-${task.status}` });
    if (task.priority !== "normal") meta.createSpan({ text: humanize(task.priority) });
    const date = getTaskDisplayDate(task);
    if (date) meta.createSpan({ text: `${date.label} ${formatDateTime(date.value.iso)}` });

    const actions = row.createDiv({ cls: "onprogram-project-task-detail-actions" });
    const status = actions.createEl("button", { text: "Status" });
    status.addEventListener("click", (event) => this.showStatusMenu(event, task));
    const edit = actions.createEl("button", { text: "Edit" });
    edit.setAttr("title", "Edit dates, priority, notes, and other task properties");
    edit.addEventListener("click", () => this.openEditor(task));
    const remove = actions.createEl("button", { text: "Remove" });
    remove.setAttr("title", "Remove this task from the project without deleting the file");
    remove.addEventListener("click", () => void this.detachTask(task));
  }

  private renderSchedule(parent: HTMLElement, linkedTasks: TaskWorkItem[]): void {
    const section = createSection(parent, "Schedule", "Dated work linked to this project.");
    const entries = linkedTasks
      .filter((task) => !isProjectTaskExcluded(task.status) && !isProjectTaskComplete(task.status))
      .map((task) => ({ task, date: getTaskDisplayDate(task) }))
      .filter((entry): entry is { task: TaskWorkItem; date: TaskDisplayDate } => Boolean(entry.date))
      .sort((a, b) => a.date.value.iso.localeCompare(b.date.value.iso));

    if (entries.length === 0) {
      section.body.createDiv({
        text: "No active project tasks have a start, scheduled, or due date yet. Use Edit on a task to add one.",
        cls: "onprogram-project-detail-empty"
      });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-project-schedule-list" });
    for (const { task, date } of entries.slice(0, 10)) {
      const row = list.createDiv({ cls: "onprogram-project-schedule-row" });
      const when = row.createDiv({ cls: "onprogram-project-schedule-date" });
      when.createEl("strong", { text: formatDateTime(date.value.iso) });
      when.createSpan({ text: date.label });
      const title = row.createEl("button", { text: task.title, cls: "onprogram-project-schedule-title" });
      title.addEventListener("click", () => this.openWorkItem(task));
      row.createSpan({ text: humanize(task.status), cls: "onprogram-project-schedule-status" });
    }
    if (entries.length > 10) {
      section.body.createDiv({
        text: `+ ${entries.length - 10} more dated tasks`,
        cls: "onprogram-project-detail-more"
      });
    }
  }

  private renderMilestones(
    parent: HTMLElement,
    project: ProjectWorkItem,
    milestones: MilestoneWorkItem[]
  ): void {
    const section = createSection(parent, "Milestones", "Optional checkpoints for larger projects.");
    const actions = section.header.createDiv({ cls: "onprogram-project-section-actions" });
    const create = actions.createEl("button", { text: "+ Milestone" });
    create.addEventListener("click", () => this.createMilestone(project));

    if (milestones.length === 0) {
      section.body.createDiv({
        text: "No milestones yet. Projects do not require milestones, but they can help mark major checkpoints.",
        cls: "onprogram-project-detail-empty"
      });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-project-milestone-list" });
    for (const milestone of [...milestones].sort((a, b) => a.dates.due.iso.localeCompare(b.dates.due.iso))) {
      const row = list.createDiv({ cls: "onprogram-project-milestone-row" });
      row.createSpan({
        text: milestone.status === "done" ? "✓" : "○",
        cls: `onprogram-project-milestone-marker${milestone.status === "done" ? " is-done" : ""}`
      });
      const main = row.createDiv({ cls: "onprogram-project-milestone-main" });
      const title = main.createEl("button", { text: milestone.title, cls: "onprogram-project-milestone-title" });
      title.addEventListener("click", () => this.openWorkItem(milestone));
      const meta = main.createDiv({ cls: "onprogram-project-milestone-meta" });
      meta.createSpan({ text: humanize(milestone.status) });
      meta.createSpan({ text: `Due ${formatDate(milestone.dates.due.iso)}` });
      const status = row.createEl("button", { text: "Status" });
      status.addEventListener("click", (event) => this.showStatusMenu(event, milestone));
      const edit = row.createEl("button", { text: "Edit" });
      edit.addEventListener("click", () => this.openEditor(milestone));
    }
  }

  private renderProjectNotes(parent: HTMLElement, project: ProjectWorkItem): void {
    const section = createSection(parent, "Project notes", "The Markdown body of the project note stays the source of truth.");
    const open = section.header.createEl("button", { text: "Open note" });
    open.addEventListener("click", () => this.openWorkItem(project));
    const preview = section.body.createDiv({ cls: "onprogram-project-notes-preview" });
    preview.setText("Loading project notes…");

    const file = this.app.vault.getAbstractFileByPath(project.source.path);
    if (!(file instanceof TFile)) {
      preview.setText("Project note was not found.");
      return;
    }

    void this.app.vault.cachedRead(file).then((content) => {
      if (!preview.isConnected || this.selectedProjectPath !== project.source.path) return;
      const body = stripFrontmatter(content).trim();
      if (!body) {
        preview.setText("No project notes yet. Open the note to add goals, context, requirements, links, or decisions.");
        preview.addClass("is-empty");
        return;
      }
      preview.setText(body.length > 900 ? `${body.slice(0, 900).trimEnd()}…` : body);
    }).catch(() => {
      if (preview.isConnected) preview.setText("Could not load the project note preview.");
    });
  }

  private renderProjectDetails(parent: HTMLElement, project: ProjectWorkItem): void {
    const section = createSection(parent, "Project details", "Project properties remain normal Markdown frontmatter.");
    const edit = section.header.createEl("button", { text: "Edit project" });
    edit.addEventListener("click", () => this.openEditor(project));
    const grid = section.body.createDiv({ cls: "onprogram-project-details-grid" });
    renderDetail(grid, "Status", humanize(project.status));
    renderDetail(grid, "Priority", humanize(project.priority));
    renderDetail(grid, "Start", project.dates.start ? formatDateTime(project.dates.start.iso) : "—");
    renderDetail(grid, "Due", project.dates.due ? formatDateTime(project.dates.due.iso) : "—");
    renderDetail(grid, "Linked Base", project.linkedBase ? displayReference(project.linkedBase) : "—");
  }

  private selectProject(project: ProjectWorkItem): void {
    this.selectedProjectPath = project.source.path;
    this.hostEl.scrollTop = 0;
    this.render();
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

  private createMilestone(project: ProjectWorkItem): void {
    new CreateMilestoneModal(this.app, {
      projectTitle: project.title,
      onSubmit: async (title, due) => {
        await this.milestoneCreator.createMilestone({
          title,
          due: { kind: "date", iso: due },
          project: projectReferenceForWrite(project),
          targetFolder: this.getConfiguredTaskFolder(),
          openAfterCreate: false
        });
        new Notice(`OnProgram: Created milestone ${title}.`);
      },
      onError: (error) => this.errorHandler.handle(error, "create milestone", true)
    }).open();
  }

  private async createLinkedTask(project: ProjectWorkItem, input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    try {
      await this.taskCreator.createTask({
        title,
        project: projectReferenceForWrite(project),
        targetFolder: this.getConfiguredTaskFolder(),
        openAfterCreate: false
      });
      new Notice(`OnProgram: Added ${title} to ${project.title}.`);
    } catch (error) {
      input.value = title;
      this.errorHandler.handle(error, "create project task", true);
    }
  }

  private openTaskManager(project: ProjectWorkItem, allItems: ProjectItems): void {
    const tasks = allItems.filter((item): item is TaskWorkItem => item.type === "task");
    const projectReference = projectReferenceForWrite(project);

    new ProjectTaskManagerModal(this.app, {
      project,
      tasks,
      onCreateTask: async (title) => {
        await this.taskCreator.createTask({
          title,
          project: projectReference,
          targetFolder: this.getConfiguredTaskFolder(),
          openAfterCreate: false
        });
      },
      onAttachTask: async (task) => {
        await this.updateWorkItem(task, { project: projectReference });
      },
      onDetachTask: async (task) => {
        await this.updateWorkItem(task, { project: null });
      },
      onToggleComplete: async (task, completed) => {
        await this.updateWorkItem(task, completed
          ? { status: "done", completed: currentLocalDateTime() }
          : { status: "todo", completed: null });
      },
      onError: (error) => this.errorHandler.handle(error, "manage project tasks", true)
    }).open();
  }

  private async toggleTaskComplete(task: TaskWorkItem, completed: boolean): Promise<void> {
    await this.updateWorkItem(task, completed
      ? { status: "done", completed: currentLocalDateTime() }
      : { status: "todo", completed: null });
  }

  private async detachTask(task: TaskWorkItem): Promise<void> {
    await this.updateWorkItem(task, { project: null });
  }

  private showStatusMenu(
    event: MouseEvent,
    item: TaskWorkItem | ProjectWorkItem | MilestoneWorkItem
  ): void {
    const menu = new Menu();
    const schema = getWorkItemTypeSchema(item.type);
    for (const status of schema.allowedStatuses) {
      menu.addItem((menuItem) => menuItem
        .setTitle(humanize(status))
        .setIcon(status === item.status ? "check" : "circle")
        .onClick(() => void this.setWorkItemStatus(item, status)));
    }
    menu.showAtMouseEvent(event);
  }

  private async setWorkItemStatus(
    item: TaskWorkItem | ProjectWorkItem | MilestoneWorkItem,
    status: WorkItemStatus
  ): Promise<void> {
    if (status === item.status) return;

    if (item.type === "task") {
      const wasComplete = isProjectTaskComplete(item.status);
      const becomesComplete = isProjectTaskComplete(status);
      await this.updateWorkItem(item, {
        status,
        completed: becomesComplete
          ? currentLocalDateTime()
          : wasComplete ? null : undefined
      });
      return;
    }

    const wasDone = item.status === "done";
    const becomesDone = status === "done";
    await this.updateWorkItem(item, {
      status,
      completed: becomesDone
        ? currentLocalDateTime()
        : wasDone ? null : undefined
    });
  }

  private async updateWorkItem(
    item: TaskWorkItem | ProjectWorkItem | MilestoneWorkItem,
    patch: Parameters<WorkItemWriter["updateFile"]>[1]
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(item.source.path);
    if (!(file instanceof TFile)) {
      this.errorHandler.handle(
        new Error(`Work item file was not found: ${item.source.path}`),
        "update project work item",
        true
      );
      return;
    }

    try {
      await this.writer.updateFile(file, patch);
    } catch (error) {
      this.errorHandler.handle(error, "update project work item", true);
    }
  }

  private openEditor(item: WorkItem): void {
    new QuickTaskEditorModal(this.app, item, this.workItemEditor, this.errorHandler).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private openWorkItem(item: WorkItem): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
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

  private showProjectMenu(event: MouseEvent, project: ProjectWorkItem, allItems: ProjectItems): void {
    const menu = new Menu();

    menu.addItem((item) => item
      .setTitle("Open project workspace")
      .setIcon("folder-kanban")
      .onClick(() => this.selectProject(project)));

    menu.addItem((item) => item
      .setTitle("Manage tasks…")
      .setIcon("list-checks")
      .onClick(() => this.openTaskManager(project, allItems)));

    menu.addItem((item) => item
      .setTitle("Open project note")
      .setIcon("file-text")
      .onClick(() => this.openWorkItem(project)));

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
          .onClick(() => void this.setWorkItemStatus(project, status)));
      }
    });

    menu.showAtMouseEvent(event);
  }
}

interface ProjectHealth {
  remaining: number;
  blocked: number;
  overdue: number;
  scheduled: number;
}

interface TaskDisplayDate {
  label: "Scheduled" | "Due" | "Starts";
  value: WorkItemDateValue;
}

function getProjectHealth(tasks: readonly TaskWorkItem[]): ProjectHealth {
  const current = tasks.filter((task) => !isProjectTaskExcluded(task.status));
  const open = current.filter((task) => !isProjectTaskComplete(task.status));
  return {
    remaining: open.length,
    blocked: open.filter((task) => BLOCKED_TASK_STATUSES.has(task.status)).length,
    overdue: open.filter((task) => isOverdue(task)).length,
    scheduled: open.filter((task) => Boolean(task.dates.scheduled)).length
  };
}

function getLinkedMilestones(project: ProjectWorkItem, items: readonly WorkItem[]): MilestoneWorkItem[] {
  return items.filter((item): item is MilestoneWorkItem =>
    item.type === "milestone"
      && Boolean(item.project)
      && projectReferenceMatches(item.project ?? "", project)
  );
}

function getNextUpTasks(tasks: readonly TaskWorkItem[]): TaskWorkItem[] {
  return tasks
    .filter((task) =>
      !isProjectTaskExcluded(task.status)
      && !isProjectTaskComplete(task.status)
      && !BLOCKED_TASK_STATUSES.has(task.status)
    )
    .slice()
    .sort((a, b) => {
      const statusDiff = nextStatusRank(a.status) - nextStatusRank(b.status);
      if (statusDiff !== 0) return statusDiff;
      const aDate = taskSortDate(a);
      const bDate = taskSortDate(b);
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      const priorityDiff = WORK_ITEM_PRIORITY_RANK[b.priority] - WORK_ITEM_PRIORITY_RANK[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title);
    });
}

function sortProjectTasks(tasks: readonly TaskWorkItem[]): TaskWorkItem[] {
  return tasks.slice().sort((a, b) => {
    const aDate = taskSortDate(a);
    const bDate = taskSortDate(b);
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    const priorityDiff = WORK_ITEM_PRIORITY_RANK[b.priority] - WORK_ITEM_PRIORITY_RANK[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.title.localeCompare(b.title);
  });
}

function nextStatusRank(status: WorkItemStatus): number {
  if (status === "in-progress") return 0;
  if (status === "scheduled") return 1;
  if (status === "planned") return 2;
  if (status === "todo") return 3;
  if (status === "inbox") return 4;
  return 5;
}

function taskSortDate(task: TaskWorkItem): string {
  const values = [task.dates.due?.iso, task.dates.scheduled?.iso, task.dates.start?.iso]
    .filter((value): value is string => Boolean(value))
    .sort();
  return values[0] ?? "9999-12-31T23:59";
}

function getTaskDisplayDate(task: TaskWorkItem): TaskDisplayDate | undefined {
  if (task.dates.scheduled) return { label: "Scheduled", value: task.dates.scheduled };
  if (task.dates.due) return { label: "Due", value: task.dates.due };
  if (task.dates.start) return { label: "Starts", value: task.dates.start };
  return undefined;
}

function isOverdue(task: TaskWorkItem): boolean {
  const due = task.dates.due?.iso.split("T")[0];
  if (!due) return false;
  return due < localDateIso(new Date());
}

function createSection(
  parent: HTMLElement,
  title: string,
  description: string
): { section: HTMLElement; header: HTMLElement; body: HTMLElement } {
  const section = parent.createDiv({ cls: "onprogram-project-detail-section" });
  const header = section.createDiv({ cls: "onprogram-project-detail-section-header" });
  const titleGroup = header.createDiv();
  titleGroup.createEl("h3", { text: title });
  titleGroup.createDiv({ text: description, cls: "onprogram-project-detail-section-description" });
  const body = section.createDiv({ cls: "onprogram-project-detail-section-body" });
  return { section, header, body };
}

function renderMetric(parent: HTMLElement, value: string, label: string): void {
  const metric = parent.createDiv({ cls: "onprogram-project-summary-metric" });
  metric.createEl("strong", { text: value });
  metric.createSpan({ text: label });
}

function renderDetail(parent: HTMLElement, label: string, value: string): void {
  const item = parent.createDiv({ cls: "onprogram-project-detail-property" });
  item.createSpan({ text: label });
  item.createEl("strong", { text: value });
}

function projectReferenceForWrite(project: ProjectWorkItem): string {
  const path = project.source.path.replace(/\.md$/i, "");
  return `[[${path}]]`;
}

function currentLocalDateTime(): WorkItemDateValue {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  return { kind: "date-time", iso: `${year}-${month}-${day}T${hour}:${minute}` };
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

function formatDateTime(value: string): string {
  if (!value.includes("T")) return formatDate(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, "");
}

const PROJECT_STYLES = `
.onprogram-projects-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--size-4-4);
}

.onprogram-projects-index-shell,
.onprogram-project-detail {
  width: min(1120px, 100%);
}

.onprogram-projects-header,
.onprogram-projects-title-group,
.onprogram-projects-filters,
.onprogram-project-row,
.onprogram-project-meta,
.onprogram-project-progress-top,
.onprogram-project-actions,
.onprogram-project-row-rollup,
.onprogram-project-detail-header,
.onprogram-project-detail-heading-meta,
.onprogram-project-detail-actions,
.onprogram-project-summary-progress-header,
.onprogram-project-summary-range,
.onprogram-project-detail-section-header,
.onprogram-project-section-actions,
.onprogram-project-next-row,
.onprogram-project-next-meta,
.onprogram-project-task-group-header,
.onprogram-project-task-detail-row,
.onprogram-project-task-detail-actions,
.onprogram-project-task-detail-meta,
.onprogram-project-schedule-row,
.onprogram-project-milestone-row,
.onprogram-project-milestone-meta {
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
.onprogram-project-progress-top,
.onprogram-project-detail-section-description,
.onprogram-project-progress-explainer,
.onprogram-project-next-meta,
.onprogram-project-task-detail-meta,
.onprogram-project-schedule-status,
.onprogram-project-milestone-meta,
.onprogram-project-row-rollup,
.onprogram-project-summary-range,
.onprogram-project-detail-property span {
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
  min-height: 82px;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
  cursor: pointer;
}

.onprogram-project-row:hover,
.onprogram-project-row:focus-visible {
  background: var(--background-modifier-hover);
  border-color: var(--background-modifier-border-hover);
  outline: none;
}

.onprogram-project-identity {
  flex: 1 1 32%;
  min-width: 190px;
}

.onprogram-project-title,
.onprogram-project-next-title,
.onprogram-project-task-detail-title,
.onprogram-project-schedule-title,
.onprogram-project-milestone-title {
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-normal);
  text-align: left;
}

.onprogram-project-title {
  display: block;
  width: 100%;
  padding: 0;
  font-weight: var(--font-semibold);
  font-size: var(--font-ui-medium);
}

.onprogram-project-meta {
  gap: var(--size-4-1);
  flex-wrap: wrap;
  margin-top: 5px;
}

.onprogram-project-meta span,
.onprogram-project-detail-heading-meta > span,
.onprogram-project-detail-heading-meta > button,
.onprogram-project-task-detail-meta span,
.onprogram-project-milestone-meta span {
  padding: 2px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
}

.onprogram-project-status {
  background: transparent;
  box-shadow: none;
}

.onprogram-project-status-in-progress { color: var(--color-blue); border-color: var(--color-blue) !important; }
.onprogram-project-status-done { color: var(--color-green); border-color: var(--color-green) !important; }
.onprogram-project-status-blocked { color: var(--color-red); border-color: var(--color-red) !important; }
.onprogram-project-status-waiting { color: var(--color-yellow); border-color: var(--color-yellow) !important; }

.onprogram-project-progress {
  flex: 1 1 42%;
  min-width: 220px;
}

.onprogram-project-progress-top {
  justify-content: space-between;
  gap: var(--size-4-2);
  margin-bottom: 6px;
}

.onprogram-project-progress-count { font-variant-numeric: tabular-nums; }

.onprogram-project-progress-track,
.onprogram-project-detail-progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}

.onprogram-project-progress-fill,
.onprogram-project-detail-progress-fill {
  height: 100%;
  min-width: 0;
  border-radius: inherit;
  background: var(--interactive-accent);
  transition: width 160ms ease;
}

.onprogram-project-row-rollup {
  gap: var(--size-4-2);
  flex-wrap: wrap;
  margin-top: 6px;
}

.onprogram-project-actions {
  justify-content: flex-end;
  gap: var(--size-4-1);
  flex: 0 0 auto;
}

.onprogram-project-tasks-button,
.onprogram-project-base-button,
.onprogram-project-more { white-space: nowrap; }
.onprogram-project-tasks-button { font-variant-numeric: tabular-nums; }

.onprogram-projects-empty,
.onprogram-projects-empty-filter,
.onprogram-project-detail-empty {
  padding: var(--size-4-5) var(--size-4-4);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
}

.onprogram-projects-empty,
.onprogram-projects-empty-filter { text-align: center; }
.onprogram-projects-empty strong {
  display: block;
  margin-bottom: var(--size-4-2);
  color: var(--text-normal);
  font-size: var(--font-ui-medium);
}
.onprogram-projects-empty button { margin-top: var(--size-4-3); }

.onprogram-project-detail-breadcrumb { margin-bottom: var(--size-4-3); }
.onprogram-project-detail-breadcrumb button {
  padding-left: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text-muted);
}

.onprogram-project-detail-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--size-4-4);
  margin-bottom: var(--size-4-4);
}

.onprogram-project-detail-heading { min-width: 0; }
.onprogram-project-detail-heading h2 {
  margin: 0 0 var(--size-4-2);
  font-size: var(--font-text-size);
  font-size: clamp(24px, 3vw, 34px);
}

.onprogram-project-detail-heading-meta {
  gap: var(--size-4-1);
  flex-wrap: wrap;
}

.onprogram-project-detail-actions {
  gap: var(--size-4-1);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-project-summary {
  display: grid;
  grid-template-columns: minmax(280px, 1.5fr) minmax(320px, 1fr);
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-5);
}

.onprogram-project-summary-progress,
.onprogram-project-summary-stats,
.onprogram-project-summary-range {
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-secondary);
}

.onprogram-project-summary-progress { padding: var(--size-4-4); }
.onprogram-project-summary-progress-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-eyebrow {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  text-transform: uppercase;
  letter-spacing: .05em;
}
.onprogram-project-progress-explainer { margin-top: var(--size-4-2); line-height: 1.45; }

.onprogram-project-summary-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}
.onprogram-project-summary-metric {
  padding: var(--size-4-3);
  border-right: 1px solid var(--background-modifier-border);
  border-bottom: 1px solid var(--background-modifier-border);
}
.onprogram-project-summary-metric:nth-child(2n) { border-right: 0; }
.onprogram-project-summary-metric:nth-last-child(-n + 2) { border-bottom: 0; }
.onprogram-project-summary-metric strong {
  display: block;
  font-size: 22px;
  line-height: 1.2;
}
.onprogram-project-summary-metric span { color: var(--text-muted); font-size: var(--font-ui-smaller); }

.onprogram-project-summary-range {
  grid-column: 1 / -1;
  gap: var(--size-4-4);
  padding: var(--size-4-2) var(--size-4-3);
}

.onprogram-project-detail-section {
  margin: 0 0 var(--size-4-5);
  padding-top: var(--size-4-4);
  border-top: 1px solid var(--background-modifier-border);
}
.onprogram-project-detail-section-header {
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-detail-section-header h3 { margin: 0 0 2px; }
.onprogram-project-detail-section-description { line-height: 1.35; }
.onprogram-project-section-actions { gap: var(--size-4-1); }

.onprogram-project-next-list,
.onprogram-project-task-list,
.onprogram-project-schedule-list,
.onprogram-project-milestone-list {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-project-next-row,
.onprogram-project-task-detail-row,
.onprogram-project-schedule-row,
.onprogram-project-milestone-row {
  gap: var(--size-4-2);
  min-width: 0;
  padding: var(--size-4-2) var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}

.onprogram-project-next-marker { color: var(--interactive-accent); }
.onprogram-project-next-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: var(--font-medium);
}
.onprogram-project-next-meta { gap: var(--size-4-2); flex-wrap: wrap; justify-content: flex-end; }

.onprogram-project-inline-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--size-4-2);
  margin-bottom: var(--size-4-3);
}
.onprogram-project-inline-composer input { width: 100%; }

.onprogram-project-task-group { margin-top: var(--size-4-3); }
.onprogram-project-task-group-header {
  justify-content: space-between;
  margin-bottom: var(--size-4-2);
}
.onprogram-project-task-group-header h4 { margin: 0; }
.onprogram-project-task-group-header span,
.onprogram-project-task-group-count { color: var(--text-muted); }
.onprogram-project-task-group-collapsible > summary {
  display: flex;
  gap: var(--size-4-2);
  align-items: center;
  cursor: pointer;
  font-weight: var(--font-semibold);
  margin-bottom: var(--size-4-2);
}

.onprogram-project-task-detail-row > input[type="checkbox"] {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}
.onprogram-project-task-detail-main,
.onprogram-project-milestone-main { flex: 1 1 auto; min-width: 0; }
.onprogram-project-task-detail-title,
.onprogram-project-milestone-title,
.onprogram-project-schedule-title {
  display: block;
  width: 100%;
  padding: 0;
  font-weight: var(--font-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.onprogram-project-task-detail-title.is-complete {
  color: var(--text-muted);
  text-decoration: line-through;
}
.onprogram-project-task-detail-meta,
.onprogram-project-milestone-meta { gap: var(--size-4-1); flex-wrap: wrap; margin-top: 3px; }
.onprogram-project-task-detail-actions { gap: var(--size-4-1); flex: 0 0 auto; }
.onprogram-project-task-detail-meta .is-status-blocked { color: var(--color-red); }
.onprogram-project-task-detail-meta .is-status-in-progress { color: var(--color-blue); }
.onprogram-project-task-detail-meta .is-status-done,
.onprogram-project-task-detail-meta .is-status-posted { color: var(--color-green); }

.onprogram-project-schedule-row { grid-template-columns: 150px minmax(0, 1fr) auto; }
.onprogram-project-schedule-date { display: grid; }
.onprogram-project-schedule-date span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-project-schedule-status { white-space: nowrap; }
.onprogram-project-detail-more { color: var(--text-muted); padding: var(--size-4-2); }

.onprogram-project-milestone-marker {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--background-modifier-border);
  border-radius: 50%;
  color: var(--text-muted);
}
.onprogram-project-milestone-marker.is-done { color: var(--color-green); border-color: var(--color-green); }

.onprogram-project-notes-preview {
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  line-height: 1.55;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-project-notes-preview.is-empty { color: var(--text-muted); }

.onprogram-project-details-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  overflow: hidden;
}
.onprogram-project-detail-property {
  min-width: 0;
  padding: var(--size-4-3);
  border-right: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}
.onprogram-project-detail-property:last-child { border-right: 0; }
.onprogram-project-detail-property span,
.onprogram-project-detail-property strong { display: block; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 900px) {
  .onprogram-project-summary { grid-template-columns: 1fr; }
  .onprogram-project-summary-range { grid-column: auto; }
  .onprogram-project-details-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onprogram-project-detail-property { border-bottom: 1px solid var(--background-modifier-border); }
  .onprogram-project-schedule-row { grid-template-columns: 120px minmax(0, 1fr); }
  .onprogram-project-schedule-status { grid-column: 2; }
}

@media (max-width: 760px) {
  .onprogram-project-row,
  .onprogram-project-detail-header,
  .onprogram-project-task-detail-row,
  .onprogram-project-milestone-row {
    align-items: stretch;
    flex-direction: column;
  }
  .onprogram-project-identity,
  .onprogram-project-progress { min-width: 0; width: 100%; }
  .onprogram-project-actions,
  .onprogram-project-detail-actions,
  .onprogram-project-task-detail-actions { justify-content: flex-start; }
  .onprogram-project-inline-composer { grid-template-columns: 1fr; }
  .onprogram-project-next-row { align-items: flex-start; flex-wrap: wrap; }
  .onprogram-project-next-meta { width: 100%; justify-content: flex-start; padding-left: 26px; }
}

@media (max-width: 520px) {
  .onprogram-projects-view { padding: var(--size-4-2); }
  .onprogram-project-summary-stats,
  .onprogram-project-details-grid { grid-template-columns: 1fr; }
  .onprogram-project-summary-metric,
  .onprogram-project-detail-property { border-right: 0; border-bottom: 1px solid var(--background-modifier-border); }
  .onprogram-project-summary-metric:last-child,
  .onprogram-project-detail-property:last-child { border-bottom: 0; }
  .onprogram-project-schedule-row { display: flex; align-items: flex-start; flex-direction: column; }
}
`;
