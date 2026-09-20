import { Menu, Notice, type QueryController, BasesView } from "obsidian";
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

const DASHBOARD_STYLES = `
.onprogram-dashboard-view {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: var(--size-4-5);
}

.onprogram-dashboard-shell {
  width: min(1280px, 100%);
  margin: 0 auto;
}

.onprogram-dashboard-header,
.onprogram-dashboard-header-actions,
.onprogram-dashboard-stat,
.onprogram-dashboard-panel-header,
.onprogram-dashboard-attention-row,
.onprogram-dashboard-upcoming-row,
.onprogram-dashboard-row-meta,
.onprogram-dashboard-board-column-header,
.onprogram-dashboard-project-top,
.onprogram-dashboard-project-progress-meta,
.onprogram-dashboard-publishing-row,
.onprogram-dashboard-publishing-pills {
  display: flex;
  align-items: center;
}

.onprogram-dashboard-header {
  justify-content: space-between;
  gap: var(--size-4-4);
  margin-bottom: var(--size-4-4);
}

.onprogram-dashboard-heading h2 {
  margin: 0 0 3px;
  font-size: clamp(24px, 3vw, 34px);
}

.onprogram-dashboard-subtitle,
.onprogram-dashboard-panel-subtitle,
.onprogram-dashboard-row-meta,
.onprogram-dashboard-board-card-meta,
.onprogram-dashboard-publishing-date,
.onprogram-dashboard-project-progress-meta,
.onprogram-dashboard-more,
.onprogram-dashboard-column-empty,
.onprogram-dashboard-calendar-empty,
.onprogram-dashboard-calendar-more {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-dashboard-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--size-4-2);
  margin-bottom: var(--size-4-4);
}

.onprogram-dashboard-stat {
  gap: var(--size-4-3);
  min-width: 0;
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-secondary);
}

.onprogram-dashboard-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 12%, transparent);
  font-weight: var(--font-bold);
}

.onprogram-dashboard-stat strong,
.onprogram-dashboard-stat span { display: block; }
.onprogram-dashboard-stat strong { font-size: 22px; line-height: 1.1; }
.onprogram-dashboard-stat span { margin-top: 2px; color: var(--text-muted); font-size: var(--font-ui-smaller); }

.onprogram-dashboard-main-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--size-4-3);
}

.onprogram-dashboard-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-m);
  background: var(--background-primary);
}

.onprogram-dashboard-panel.is-wide { grid-column: 1 / -1; }

.onprogram-dashboard-panel-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  padding: var(--size-4-3) var(--size-4-4);
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.onprogram-dashboard-panel-header h3 { margin: 0 0 2px; font-size: var(--font-ui-medium); }
.onprogram-dashboard-panel-body { padding: var(--size-4-3); }
.onprogram-dashboard-empty { padding: var(--size-4-4); color: var(--text-muted); text-align: center; }

.onprogram-dashboard-attention-list,
.onprogram-dashboard-upcoming-list,
.onprogram-dashboard-project-list,
.onprogram-dashboard-publishing-list,
.onprogram-dashboard-board-cards {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-dashboard-attention-row,
.onprogram-dashboard-upcoming-row,
.onprogram-dashboard-publishing-row {
  gap: var(--size-4-2);
  min-width: 0;
  padding: var(--size-4-2);
  border-radius: var(--radius-s);
}

.onprogram-dashboard-attention-row:hover,
.onprogram-dashboard-upcoming-row:hover,
.onprogram-dashboard-publishing-row:hover { background: var(--background-modifier-hover); }

.onprogram-dashboard-attention-marker {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--background-modifier-border);
}
.onprogram-dashboard-attention-marker.is-overdue,
.onprogram-dashboard-attention-marker.is-blocked { color: var(--color-red); border-color: var(--color-red); }
.onprogram-dashboard-attention-marker.is-waiting { color: var(--color-yellow); border-color: var(--color-yellow); }

.onprogram-dashboard-item-title,
.onprogram-dashboard-project-title {
  min-width: 0;
  padding: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-normal);
  text-align: left;
  font-weight: var(--font-medium);
}
.onprogram-dashboard-item-title { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.onprogram-dashboard-row-meta { gap: var(--size-4-1); flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; }
.onprogram-dashboard-row-meta span { padding: 1px 6px; border: 1px solid var(--background-modifier-border); border-radius: 999px; }
.onprogram-dashboard-row-meta .is-warning { color: var(--color-red); border-color: var(--color-red); }

.onprogram-dashboard-date-block {
  width: 42px;
  flex: 0 0 42px;
  text-align: center;
  border-right: 1px solid var(--background-modifier-border);
}
.onprogram-dashboard-date-block strong,
.onprogram-dashboard-date-block span { display: block; }
.onprogram-dashboard-date-block strong { font-size: 18px; }
.onprogram-dashboard-date-block span { color: var(--text-muted); font-size: 10px; text-transform: uppercase; }
.onprogram-dashboard-upcoming-main { min-width: 0; flex: 1 1 auto; }

.onprogram-dashboard-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--size-4-2);
}
.onprogram-dashboard-board-column {
  min-width: 0;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-board-column-header {
  justify-content: space-between;
  margin-bottom: var(--size-4-2);
  font-weight: var(--font-semibold);
}
.onprogram-dashboard-count {
  min-width: 24px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
  text-align: center;
  font-size: var(--font-ui-smaller);
}
.onprogram-dashboard-board-card {
  min-width: 0;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-primary);
}
.onprogram-dashboard-board-card:hover { border-color: var(--background-modifier-border-hover); }
.onprogram-dashboard-board-card-meta { display: flex; gap: var(--size-4-1); flex-wrap: wrap; margin-top: 4px; }
.onprogram-dashboard-board-card-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.onprogram-dashboard-more { margin-top: var(--size-4-2); text-align: center; }
.onprogram-dashboard-column-empty { padding: var(--size-4-3); text-align: center; }

.onprogram-dashboard-calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--size-4-1);
}
.onprogram-dashboard-calendar-day {
  min-width: 0;
  min-height: 128px;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-calendar-day.is-today { border-color: var(--interactive-accent); }
.onprogram-dashboard-calendar-day-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--size-4-2); }
.onprogram-dashboard-calendar-day-header span { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-calendar-day-header strong { font-size: 17px; }
.onprogram-dashboard-calendar-day-tasks { display: grid; gap: 4px; }
.onprogram-dashboard-calendar-task {
  width: 100%;
  min-width: 0;
  height: auto;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--background-modifier-border);
  border-radius: 5px;
  background: var(--background-primary);
  box-shadow: none;
  color: var(--text-normal);
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}
.onprogram-dashboard-calendar-more,
.onprogram-dashboard-calendar-empty { padding: 4px; text-align: center; }

.onprogram-dashboard-project-card {
  padding: var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}
.onprogram-dashboard-project-top,
.onprogram-dashboard-project-progress-meta { justify-content: space-between; gap: var(--size-4-2); }
.onprogram-dashboard-project-title { font-weight: var(--font-semibold); }
.onprogram-dashboard-project-status { color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-project-progress-meta { margin-top: var(--size-4-2); color: var(--text-muted); font-size: var(--font-ui-smaller); }
.onprogram-dashboard-project-progress-track {
  height: 7px;
  margin: 6px 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--background-modifier-border);
}
.onprogram-dashboard-project-progress-fill { height: 100%; border-radius: inherit; background: var(--interactive-accent); }

.onprogram-dashboard-publishing-main { min-width: 0; flex: 1 1 auto; }
.onprogram-dashboard-publishing-date { margin-top: 2px; }
.onprogram-dashboard-publishing-pills { gap: 4px; flex: 0 0 auto; }
.onprogram-dashboard-publishing-pill {
  min-width: 38px;
  padding: 2px 7px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  text-align: center;
  font-size: 10px;
  font-weight: var(--font-semibold);
}
.onprogram-dashboard-publishing-pill[data-state="scheduled"] { color: var(--color-blue); border-color: var(--color-blue); background: color-mix(in srgb, var(--color-blue) 12%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="posted"] { color: var(--color-green); border-color: var(--color-green); background: color-mix(in srgb, var(--color-green) 12%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="failed"],
.onprogram-dashboard-publishing-pill[data-state="invalid"] { color: var(--color-red); border-color: var(--color-red); background: color-mix(in srgb, var(--color-red) 10%, transparent); }
.onprogram-dashboard-publishing-pill[data-state="skipped"] { opacity: .6; }

.onprogram-dashboard-schema-notice {
  display: grid;
  gap: 2px;
  margin-top: var(--size-4-3);
  padding: var(--size-4-3);
  border: 1px solid var(--color-yellow);
  border-radius: var(--radius-s);
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}
.onprogram-dashboard-schema-notice strong { color: var(--text-normal); }

@media (max-width: 980px) {
  .onprogram-dashboard-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .onprogram-dashboard-main-grid { grid-template-columns: 1fr; }
  .onprogram-dashboard-panel.is-wide { grid-column: auto; }
  .onprogram-dashboard-calendar { overflow-x: auto; grid-template-columns: repeat(7, minmax(120px, 1fr)); }
}

@media (max-width: 720px) {
  .onprogram-dashboard-view { padding: var(--size-4-3); }
  .onprogram-dashboard-header { align-items: flex-start; flex-direction: column; }
  .onprogram-dashboard-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .onprogram-dashboard-board { grid-template-columns: 1fr; }
  .onprogram-dashboard-attention-row,
  .onprogram-dashboard-publishing-row { align-items: flex-start; flex-wrap: wrap; }
  .onprogram-dashboard-row-meta,
  .onprogram-dashboard-publishing-pills { width: 100%; justify-content: flex-start; padding-left: 30px; }
}

@media (max-width: 460px) {
  .onprogram-dashboard-summary { grid-template-columns: 1fr; }
}
`;
