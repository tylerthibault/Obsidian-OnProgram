import { Menu, Notice, type QueryController, BasesView } from "obsidian";
import { DASHBOARD_STYLES } from "./styles/OnProgramDashboardStyles";
import { localDateIso } from "../../utils/dateTime";
import { humanize } from "../../utils/text";
import { CreateTaskModal } from "../../components/CreateTaskModal";
import { openLinkedMarkdownCreateFlow } from "../../components/LinkedMarkdownCreateFlow";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { ProjectWorkItem, TaskWorkItem, WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import {
  PUBLISHING_PLATFORMS,
  getPublishingPropertyKeys,
  hasPublishingStateValue,
  normalizePublishingState,
  publishingStateSymbol,
  type PublishingState
} from "../../models/publishing/PublishingPlatform";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { LinkedMarkdownInstanceStore } from "../../services/bases/LinkedMarkdownInstanceStore";
import type { ProjectAssignmentService } from "../../services/projects/ProjectAssignmentService";
import { calculateProjectProgress, getLinkedProjectTasks } from "../../services/projects/ProjectRollup";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";

export const ONPROGRAM_DASHBOARD_VIEW_ID = "onprogram-dashboard";

type DashboardItems = ReturnType<BasesWorkItemAdapter["adapt"]>["items"];

const COMPLETE_STATUSES = new Set<WorkItemStatus>(["done", "posted"]);
const CLOSED_STATUSES = new Set<WorkItemStatus>(["done", "posted", "cancelled", "archived"]);
const ACTIVE_PROJECT_EXCLUSIONS = new Set<WorkItemStatus>(["done", "cancelled", "archived"]);
const ATTENTION_STATUSES = new Set<WorkItemStatus>(["blocked", "waiting"]);

interface PublishingEntry {
  task: TaskWorkItem;
  platforms: Array<{
    abbreviation: string;
    name: string;
    state?: PublishingState;
  }>;
}

interface CalendarDay {
  iso: string;
  date: Date;
  tasks: TaskWorkItem[];
}

export class OnProgramDashboardView extends BasesView {
  type = ONPROGRAM_DASHBOARD_VIEW_ID;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly taskCreator: TaskCreator,
    private readonly projectAssignment: ProjectAssignmentService,
    private readonly workItemOpener: WorkItemOpener,
    private readonly linkedMarkdownStore: LinkedMarkdownInstanceStore,
    private readonly errorHandler: ErrorHandler
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-dashboard-view");

    const style = this.hostEl.createEl("style");
    style.textContent = DASHBOARD_STYLES;

    const result = this.adapter.adapt(this.data);
    const tasks = result.items.filter((item): item is TaskWorkItem => item.type === "task");
    const projects = result.items.filter((item): item is ProjectWorkItem => item.type === "project");
    const shell = this.hostEl.createDiv({ cls: "onprogram-dashboard-shell" });

    this.renderHeader(shell, tasks);
    this.renderSummary(shell, tasks, projects);

    const mainGrid = shell.createDiv({ cls: "onprogram-dashboard-main-grid" });
    this.renderAttention(mainGrid, tasks);
    this.renderUpcoming(mainGrid, tasks);
    this.renderBoardSnapshot(mainGrid, tasks);
    this.renderCalendarSnapshot(mainGrid, tasks);
    this.renderProjects(mainGrid, projects, result.items);
    this.renderPublishing(mainGrid, tasks);

    if (result.invalid.length > 0) {
      const notice = shell.createDiv({ cls: "onprogram-dashboard-schema-notice" });
      notice.createEl("strong", { text: `${result.invalid.length} OnProgram item${result.invalid.length === 1 ? "" : "s"} need attention` });
      notice.createSpan({ text: "Some files in this Base could not be included because their work-item properties are invalid." });
    }
  }

  private renderHeader(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const header = parent.createDiv({ cls: "onprogram-dashboard-header" });
    const identity = header.createDiv({ cls: "onprogram-dashboard-heading" });
    identity.createEl("h2", { text: "Dashboard" });
    identity.createDiv({
      text: `${formatLongDate(new Date())} · ${tasks.length} task${tasks.length === 1 ? "" : "s"} in this Base`,
      cls: "onprogram-dashboard-subtitle"
    });

    const actions = header.createDiv({ cls: "onprogram-dashboard-header-actions" });
    const newTask = actions.createEl("button", { text: "+ New task", cls: "mod-cta" });
    newTask.addEventListener("click", () => this.createTask());
  }

  private renderSummary(parent: HTMLElement, tasks: TaskWorkItem[], projects: ProjectWorkItem[]): void {
    const today = localDateIso(new Date());
    const openTasks = tasks.filter((task) => !CLOSED_STATUSES.has(task.status));
    const dueToday = openTasks.filter((task) => task.dates.due?.iso.split("T")[0] === today).length;
    const inProgress = openTasks.filter((task) => task.status === "in-progress").length;
    const scheduled = openTasks.filter((task) => Boolean(task.dates.scheduled)).length;
    const publishQueue = this.getPublishingEntries(tasks).filter((entry) =>
      entry.platforms.some((platform) => platform.state && platform.state !== "posted" && platform.state !== "skipped")
    ).length;
    const activeProjects = projects.filter((project) => !ACTIVE_PROJECT_EXCLUSIONS.has(project.status)).length;

    const cards = parent.createDiv({ cls: "onprogram-dashboard-summary" });
    this.renderSummaryCard(cards, String(dueToday), "Due today", "calendar-check");
    this.renderSummaryCard(cards, String(inProgress), "In progress", "loader");
    this.renderSummaryCard(cards, String(scheduled), "Scheduled", "calendar-clock");
    this.renderSummaryCard(cards, String(publishQueue), "To publish", "send");
    this.renderSummaryCard(cards, String(activeProjects), "Active projects", "folder-kanban");
  }

  private renderSummaryCard(parent: HTMLElement, value: string, label: string, icon: string): void {
    const card = parent.createDiv({ cls: "onprogram-dashboard-stat" });
    const iconEl = card.createDiv({ text: summarySymbol(icon), cls: "onprogram-dashboard-stat-icon" });
    iconEl.setAttr("aria-hidden", "true");
    const copy = card.createDiv();
    copy.createEl("strong", { text: value });
    copy.createSpan({ text: label });
  }

  private renderAttention(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const section = this.createPanel(parent, "Needs attention", "Blocked, waiting, or overdue work", "wide");
    const open = tasks.filter((task) => !CLOSED_STATUSES.has(task.status));
    const attention = open
      .filter((task) => ATTENTION_STATUSES.has(task.status) || isOverdue(task))
      .sort((a, b) => attentionRank(a) - attentionRank(b) || taskDateKey(a).localeCompare(taskDateKey(b)))
      .slice(0, 6);

    if (attention.length === 0) {
      section.body.createDiv({ text: "Nothing is blocked or overdue right now.", cls: "onprogram-dashboard-empty" });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-dashboard-attention-list" });
    for (const task of attention) {
      const row = list.createDiv({ cls: "onprogram-dashboard-attention-row" });
      const marker = row.createSpan({
        text: isOverdue(task) ? "!" : task.status === "blocked" ? "×" : "…",
        cls: `onprogram-dashboard-attention-marker is-${isOverdue(task) ? "overdue" : task.status}`
      });
      marker.setAttr("aria-hidden", "true");
      const title = row.createEl("button", { text: task.title, cls: "onprogram-dashboard-item-title" });
      title.addEventListener("click", () => this.openItem(task));
      const meta = row.createDiv({ cls: "onprogram-dashboard-row-meta" });
      meta.createSpan({ text: humanize(task.status) });
      if (task.dates.due) meta.createSpan({ text: `Due ${formatShortDate(task.dates.due.iso)}` });
      this.addTaskContextMenu(row, task);
    }
  }

  private renderUpcoming(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const section = this.createPanel(parent, "Up next", "The next dated pieces of open work");
    const upcoming = tasks
      .filter((task) => !CLOSED_STATUSES.has(task.status))
      .map((task) => ({ task, date: primaryTaskDate(task) }))
      .filter((entry): entry is { task: TaskWorkItem; date: string } => Boolean(entry.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 7);

    if (upcoming.length === 0) {
      section.body.createDiv({ text: "No dated work is scheduled yet.", cls: "onprogram-dashboard-empty" });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-dashboard-upcoming-list" });
    for (const { task, date } of upcoming) {
      const row = list.createDiv({ cls: "onprogram-dashboard-upcoming-row" });
      const dateEl = row.createDiv({ cls: "onprogram-dashboard-date-block" });
      dateEl.createEl("strong", { text: formatDay(date) });
      dateEl.createSpan({ text: formatMonth(date) });
      const main = row.createDiv({ cls: "onprogram-dashboard-upcoming-main" });
      const title = main.createEl("button", { text: task.title, cls: "onprogram-dashboard-item-title" });
      title.addEventListener("click", () => this.openItem(task));
      const meta = main.createDiv({ cls: "onprogram-dashboard-row-meta" });
      meta.createSpan({ text: humanize(task.status) });
      if (task.project) meta.createSpan({ text: displayReference(task.project) });
      this.addTaskContextMenu(row, task);
    }
  }

  private renderBoardSnapshot(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const section = this.createPanel(parent, "Board", "A compact status snapshot", "wide");
    const columns = [
      {
        label: "To do",
        tasks: tasks.filter((task) => ["inbox", "todo", "planned"].includes(task.status))
      },
      {
        label: "In progress",
        tasks: tasks.filter((task) => ["scheduled", "in-progress", "blocked", "waiting"].includes(task.status))
      },
      {
        label: "Complete",
        tasks: tasks.filter((task) => COMPLETE_STATUSES.has(task.status)).sort((a, b) => b.source.mtime - a.source.mtime)
      }
    ];

    const board = section.body.createDiv({ cls: "onprogram-dashboard-board" });
    for (const column of columns) {
      const col = board.createDiv({ cls: "onprogram-dashboard-board-column" });
      const header = col.createDiv({ cls: "onprogram-dashboard-board-column-header" });
      header.createSpan({ text: column.label });
      header.createSpan({ text: String(column.tasks.length), cls: "onprogram-dashboard-count" });

      const cards = col.createDiv({ cls: "onprogram-dashboard-board-cards" });
      for (const task of sortTasks(column.tasks).slice(0, 5)) {
        const card = cards.createDiv({ cls: "onprogram-dashboard-board-card" });
        const title = card.createEl("button", { text: task.title, cls: "onprogram-dashboard-item-title" });
        title.addEventListener("click", () => this.openItem(task));
        const meta = card.createDiv({ cls: "onprogram-dashboard-board-card-meta" });
        if (task.project) meta.createSpan({ text: displayReference(task.project) });
        if (task.priority === "high" || task.priority === "urgent") meta.createSpan({ text: humanize(task.priority) });
        this.addTaskContextMenu(card, task);
      }
      if (column.tasks.length === 0) cards.createDiv({ text: "Nothing here", cls: "onprogram-dashboard-column-empty" });
      if (column.tasks.length > 5) col.createDiv({ text: `+ ${column.tasks.length - 5} more`, cls: "onprogram-dashboard-more" });
    }
  }

  private renderCalendarSnapshot(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const section = this.createPanel(parent, "Calendar", "Today and the next six days", "wide");
    const days = buildCalendarDays(tasks);
    const strip = section.body.createDiv({ cls: "onprogram-dashboard-calendar" });

    for (const day of days) {
      const column = strip.createDiv({ cls: `onprogram-dashboard-calendar-day${day.iso === localDateIso(new Date()) ? " is-today" : ""}` });
      const header = column.createDiv({ cls: "onprogram-dashboard-calendar-day-header" });
      header.createSpan({ text: day.date.toLocaleDateString(undefined, { weekday: "short" }) });
      header.createEl("strong", { text: String(day.date.getDate()) });

      const dayTasks = column.createDiv({ cls: "onprogram-dashboard-calendar-day-tasks" });
      for (const task of day.tasks.slice(0, 3)) {
        const item = dayTasks.createEl("button", { text: task.title, cls: "onprogram-dashboard-calendar-task" });
        item.setAttr("title", task.title);
        item.addEventListener("click", () => this.openItem(task));
        item.addEventListener("contextmenu", (event) => this.showTaskMenu(event, task));
      }
      if (day.tasks.length === 0) dayTasks.createDiv({ text: "—", cls: "onprogram-dashboard-calendar-empty" });
      if (day.tasks.length > 3) dayTasks.createDiv({ text: `+${day.tasks.length - 3}`, cls: "onprogram-dashboard-calendar-more" });
    }
  }

  private renderProjects(parent: HTMLElement, projects: ProjectWorkItem[], allItems: DashboardItems): void {
    const section = this.createPanel(parent, "Projects", "Active projects and current linked work");
    const active = projects
      .filter((project) => !ACTIVE_PROJECT_EXCLUSIONS.has(project.status))
      .sort((a, b) => projectSortKey(a).localeCompare(projectSortKey(b)))
      .slice(0, 6);

    if (active.length === 0) {
      section.body.createDiv({ text: "No active projects in this Base.", cls: "onprogram-dashboard-empty" });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-dashboard-project-list" });
    for (const project of active) {
      const progress = calculateProjectProgress(project, allItems);
      const tasks = getLinkedProjectTasks(project, allItems);
      const blocked = tasks.filter((task) => !CLOSED_STATUSES.has(task.status) && ATTENTION_STATUSES.has(task.status)).length;
      const card = list.createDiv({ cls: "onprogram-dashboard-project-card" });
      const top = card.createDiv({ cls: "onprogram-dashboard-project-top" });
      const title = top.createEl("button", { text: project.title, cls: "onprogram-dashboard-project-title" });
      title.addEventListener("click", () => this.openItem(project));
      top.createSpan({ text: humanize(project.status), cls: "onprogram-dashboard-project-status" });

      const progressMeta = card.createDiv({ cls: "onprogram-dashboard-project-progress-meta" });
      progressMeta.createSpan({ text: "Current linked work" });
      progressMeta.createSpan({ text: progress.total === 0 ? "No tasks" : `${progress.completed} / ${progress.total}` });
      const track = card.createDiv({ cls: "onprogram-dashboard-project-progress-track" });
      const fill = track.createDiv({ cls: "onprogram-dashboard-project-progress-fill" });
      fill.style.width = `${progress.percentage}%`;

      const meta = card.createDiv({ cls: "onprogram-dashboard-row-meta" });
      if (project.dates.due) meta.createSpan({ text: `Due ${formatShortDate(project.dates.due.iso)}` });
      if (blocked > 0) meta.createSpan({ text: `${blocked} blocked/waiting`, cls: "is-warning" });
    }
  }

  private renderPublishing(parent: HTMLElement, tasks: TaskWorkItem[]): void {
    const section = this.createPanel(parent, "Publishing", "Content distribution across active platforms");
    const entries = this.getPublishingEntries(tasks)
      .sort((a, b) => publishingRank(a) - publishingRank(b) || taskDateKey(a.task).localeCompare(taskDateKey(b.task)))
      .slice(0, 8);

    if (entries.length === 0) {
      section.body.createDiv({ text: "No publishing platforms are active on tasks in this Base.", cls: "onprogram-dashboard-empty" });
      return;
    }

    const list = section.body.createDiv({ cls: "onprogram-dashboard-publishing-list" });
    for (const entry of entries) {
      const row = list.createDiv({ cls: "onprogram-dashboard-publishing-row" });
      const main = row.createDiv({ cls: "onprogram-dashboard-publishing-main" });
      const title = main.createEl("button", { text: entry.task.title, cls: "onprogram-dashboard-item-title" });
      title.addEventListener("click", () => this.openItem(entry.task));
      if (entry.task.dates.scheduled) {
        main.createDiv({ text: formatShortDateTime(entry.task.dates.scheduled.iso), cls: "onprogram-dashboard-publishing-date" });
      }

      const pills = row.createDiv({ cls: "onprogram-dashboard-publishing-pills" });
      for (const platform of entry.platforms) {
        const pill = pills.createSpan({
          text: `${platform.abbreviation} ${publishingStateSymbol(platform.state)}`,
          cls: "onprogram-dashboard-publishing-pill"
        });
        pill.dataset.state = platform.state ?? "invalid";
        pill.setAttr("title", `${platform.name} — ${platform.state ? humanize(platform.state) : "Invalid state"}`);
      }
      this.addTaskContextMenu(row, entry.task);
    }
  }

  private getPublishingEntries(tasks: readonly TaskWorkItem[]): PublishingEntry[] {
    const entries: PublishingEntry[] = [];
    for (const task of tasks) {
      const file = this.app.vault.getAbstractFileByPath(task.source.path);
      if (!file || !("path" in file)) continue;
      const frontmatter = this.app.metadataCache.getFileCache(file as never)?.frontmatter;
      if (!frontmatter) continue;

      const platforms: PublishingEntry["platforms"] = [];
      for (const platform of PUBLISHING_PLATFORMS) {
        const keys = getPublishingPropertyKeys(platform);
        const raw = frontmatter[keys.state];
        if (!hasPublishingStateValue(raw)) continue;
        platforms.push({
          abbreviation: platform.abbreviation,
          name: platform.name,
          state: normalizePublishingState(raw)
        });
      }
      if (platforms.length > 0) entries.push({ task, platforms });
    }
    return entries;
  }

  private createTask(): void {
    new CreateTaskModal(this.app, {
      onSubmit: async (title) => {
        const created = await this.taskCreator.createTask({
          title,
          targetFolder: this.getConfiguredTaskFolder(),
          openAfterCreate: false
        });
        new Notice(`OnProgram: Created ${created.title}.`);
      },
      onLinkMarkdown: async (file, label) => {
        openLinkedMarkdownCreateFlow(
          this.app,
          this.linkedMarkdownStore,
          this.errorHandler,
          { initialFile: file, initialLabel: label }
        );
      },
      onError: (error) => this.errorHandler.handle(error, "create dashboard task", true)
    }).open();
  }

  private getConfiguredTaskFolder(): string | undefined {
    const value = this.config.get("taskFolder");
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  private openItem(item: WorkItem): void {
    const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
    if (entry) void this.workItemOpener.open(entry.file);
  }

  private addTaskContextMenu(element: HTMLElement, task: TaskWorkItem): void {
    element.addEventListener("contextmenu", (event) => this.showTaskMenu(event, task));
  }

  private showTaskMenu(event: MouseEvent, task: TaskWorkItem): void {
    event.preventDefault();
    event.stopPropagation();
    const menu = new Menu();
    this.projectAssignment.addProjectMenuItem(menu, task);
    menu.addItem((item) => item
      .setTitle("Open task note")
      .setIcon("file-text")
      .onClick(() => this.openItem(task)));
    menu.showAtMouseEvent(event);
  }

  private createPanel(
    parent: HTMLElement,
    title: string,
    subtitle: string,
    size: "normal" | "wide" = "normal"
  ): { panel: HTMLElement; header: HTMLElement; body: HTMLElement } {
    const panel = parent.createDiv({ cls: `onprogram-dashboard-panel${size === "wide" ? " is-wide" : ""}` });
    const header = panel.createDiv({ cls: "onprogram-dashboard-panel-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: title });
    copy.createDiv({ text: subtitle, cls: "onprogram-dashboard-panel-subtitle" });
    const body = panel.createDiv({ cls: "onprogram-dashboard-panel-body" });
    return { panel, header, body };
  }
}

function buildCalendarDays(tasks: readonly TaskWorkItem[]): CalendarDay[] {
  const start = startOfLocalDay(new Date());
  const days: CalendarDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const iso = localDateIso(date);
    days.push({
      iso,
      date,
      tasks: tasks
        .filter((task) => !CLOSED_STATUSES.has(task.status) && primaryTaskDate(task)?.split("T")[0] === iso)
        .sort((a, b) => taskDateKey(a).localeCompare(taskDateKey(b)))
    });
  }
  return days;
}

function sortTasks(tasks: readonly TaskWorkItem[]): TaskWorkItem[] {
  return tasks.slice().sort((a, b) => {
    const aDate = taskDateKey(a);
    const bDate = taskDateKey(b);
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    if (a.priority !== b.priority) return priorityRank(b.priority) - priorityRank(a.priority);
    return a.title.localeCompare(b.title);
  });
}

function taskDateKey(task: TaskWorkItem): string {
  return primaryTaskDate(task) ?? "9999-12-31T23:59";
}

function primaryTaskDate(task: TaskWorkItem): string | undefined {
  return task.dates.scheduled?.iso ?? task.dates.due?.iso ?? task.dates.start?.iso;
}

function projectSortKey(project: ProjectWorkItem): string {
  return project.dates.due?.iso ?? project.dates.start?.iso ?? `9999-${project.title.toLowerCase()}`;
}

function isOverdue(task: TaskWorkItem): boolean {
  const due = task.dates.due?.iso.split("T")[0];
  return Boolean(due && due < localDateIso(new Date()));
}

function attentionRank(task: TaskWorkItem): number {
  if (isOverdue(task)) return 0;
  if (task.status === "blocked") return 1;
  if (task.status === "waiting") return 2;
  return 3;
}

function publishingRank(entry: PublishingEntry): number {
  if (entry.platforms.some((platform) => platform.state === "failed")) return 0;
  if (entry.platforms.some((platform) => platform.state === "scheduled")) return 1;
  if (entry.platforms.some((platform) => platform.state === "planned")) return 2;
  return 3;
}

function priorityRank(priority: TaskWorkItem["priority"]): number {
  switch (priority) {
    case "urgent": return 4;
    case "high": return 3;
    case "normal": return 2;
    case "low": return 1;
  }
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatShortDate(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!match) return value;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatShortDateTime(value: string): string {
  if (!value.includes("T")) return formatShortDate(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDay(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  return String(Number(dateOnly.split("-")[2] ?? "0"));
}

function formatMonth(value: string): string {
  const dateOnly = value.split("T")[0] ?? value;
  const parts = dateOnly.split("-");
  const month = Number(parts[1] ?? "1") - 1;
  return new Date(2000, month, 1).toLocaleDateString(undefined, { month: "short" });
}


function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}

function summarySymbol(icon: string): string {
  switch (icon) {
    case "calendar-check": return "✓";
    case "loader": return "◉";
    case "calendar-clock": return "◷";
    case "send": return "↗";
    case "folder-kanban": return "▣";
    default: return "•";
  }
}

