import { Modal, Notice, Setting, type App } from "obsidian";
import type { ProjectWorkItem, TaskWorkItem } from "../models/work-item/WorkItem";
import { projectReferenceMatches } from "../services/projects/ProjectRollup";

export interface ProjectTaskManagerModalOptions {
  project: ProjectWorkItem;
  tasks: TaskWorkItem[];
  onCreateTask: (title: string) => Promise<void>;
  onAttachTask: (task: TaskWorkItem) => Promise<void>;
  onDetachTask: (task: TaskWorkItem) => Promise<void>;
  onToggleComplete: (task: TaskWorkItem, completed: boolean) => Promise<void>;
  onError: (error: unknown) => void;
}

const COMPLETE_STATUSES = new Set(["done", "posted"]);
const LOCKED_COMPLETE_STATUSES = new Set(["posted", "cancelled", "archived"]);

/**
 * Project task popup.
 *
 * Membership and completion intentionally use different controls:
 * - the upper checklist checkbox represents task completion;
 * - the lower task picker attaches existing work to the project.
 *
 * This keeps a project's task total open-ended: the total is always derived
 * from the tasks currently linked to the project rather than stored up front.
 */
export class ProjectTaskManagerModal extends Modal {
  private newTaskTitle = "";
  private search = "";
  private busy = false;
  private readonly attachedPaths = new Set<string>();
  private readonly optimisticComplete = new Map<string, boolean>();
  private readonly createdTasks: Array<{ title: string }> = [];

  constructor(
    app: App,
    private readonly options: ProjectTaskManagerModalOptions
  ) {
    super(app);

    for (const task of options.tasks) {
      if (task.project && projectReferenceMatches(task.project, options.project)) {
        this.attachedPaths.add(task.source.path);
      }
    }
  }

  onOpen(): void {
    this.modalEl.addClass("onprogram-project-task-manager-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Project tasks — ${this.options.project.title}` });
    contentEl.createEl("p", {
      text: "Add work whenever you discover it. Project progress is calculated from the tasks linked here, so the total can grow or shrink over time.",
      cls: "onprogram-project-task-manager-description"
    });

    this.renderNewTaskComposer();
    this.renderChecklist();
    this.renderExistingTaskPicker();
  }

  private renderNewTaskComposer(): void {
    const section = this.contentEl.createDiv({ cls: "onprogram-project-task-manager-section" });
    section.createEl("h3", { text: "Add a new task" });

    new Setting(section)
      .setDesc("Creates a normal OnProgram task already linked to this project.")
      .addText((text) => {
        text
          .setPlaceholder("What needs to be done?")
          .setValue(this.newTaskTitle)
          .onChange((value) => { this.newTaskTitle = value; });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" || event.shiftKey) return;
          event.preventDefault();
          void this.createTask();
        });
      })
      .addButton((button) => button
        .setButtonText("Add")
        .setCta()
        .onClick(() => void this.createTask()));
  }

  private renderChecklist(): void {
    const section = this.contentEl.createDiv({ cls: "onprogram-project-task-manager-section" });
    const linkedTasks = this.options.tasks.filter((task) => this.attachedPaths.has(task.source.path));
    const header = section.createDiv({ cls: "onprogram-project-task-manager-section-header" });
    header.createEl("h3", { text: "Checklist" });
    header.createSpan({
      text: `${linkedTasks.length + this.createdTasks.length} ${linkedTasks.length + this.createdTasks.length === 1 ? "task" : "tasks"}`,
      cls: "onprogram-project-task-manager-count"
    });

    if (linkedTasks.length === 0 && this.createdTasks.length === 0) {
      section.createDiv({
        text: "No tasks are linked yet. Create one above or add existing work below.",
        cls: "onprogram-project-task-manager-empty"
      });
      return;
    }

    const list = section.createDiv({ cls: "onprogram-project-task-checklist" });

    for (const task of linkedTasks) {
      const row = list.createDiv({ cls: "onprogram-project-task-row" });
      const left = row.createDiv({ cls: "onprogram-project-task-row-main" });
      const checkbox = left.createEl("input", { type: "checkbox" });
      const optimistic = this.optimisticComplete.get(task.source.path);
      const completed = optimistic ?? COMPLETE_STATUSES.has(task.status);
      checkbox.checked = completed;
      checkbox.disabled = this.busy || LOCKED_COMPLETE_STATUSES.has(task.status);
      checkbox.setAttr("aria-label", `${completed ? "Reopen" : "Complete"} ${task.title}`);
      checkbox.addEventListener("change", () => {
        void this.toggleComplete(task, checkbox.checked);
      });

      const text = left.createDiv({ cls: "onprogram-project-task-row-text" });
      text.createDiv({
        text: task.title,
        cls: `onprogram-project-task-title${completed ? " is-complete" : ""}`
      });
      text.createDiv({
        text: humanize(task.status),
        cls: "onprogram-project-task-status"
      });

      const detach = row.createEl("button", { text: "Remove" });
      detach.setAttr("title", "Remove this task from the project without deleting it");
      detach.disabled = this.busy;
      detach.addEventListener("click", () => void this.detachTask(task));
    }

    for (const created of this.createdTasks) {
      const row = list.createDiv({ cls: "onprogram-project-task-row" });
      const left = row.createDiv({ cls: "onprogram-project-task-row-main" });
      const checkbox = left.createEl("input", { type: "checkbox" });
      checkbox.disabled = true;
      const text = left.createDiv({ cls: "onprogram-project-task-row-text" });
      text.createDiv({ text: created.title, cls: "onprogram-project-task-title" });
      text.createDiv({ text: "Todo · newly created", cls: "onprogram-project-task-status" });
    }
  }

  private renderExistingTaskPicker(): void {
    const section = this.contentEl.createDiv({ cls: "onprogram-project-task-manager-section" });
    section.createEl("h3", { text: "Add existing tasks" });

    const search = section.createEl("input", {
      type: "search",
      cls: "onprogram-project-task-search"
    });
    search.placeholder = "Search tasks…";
    search.value = this.search;
    search.addEventListener("input", () => {
      this.search = search.value;
      this.render();
      const refreshed = this.contentEl.querySelector<HTMLInputElement>(".onprogram-project-task-search");
      refreshed?.focus();
      if (refreshed) refreshed.setSelectionRange(refreshed.value.length, refreshed.value.length);
    });

    const query = this.search.trim().toLowerCase();
    const available = this.options.tasks
      .filter((task) => !this.attachedPaths.has(task.source.path))
      .filter((task) => !query || task.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (available.length === 0) {
      section.createDiv({
        text: query ? "No matching tasks." : "Every task in this Base is already linked to this project.",
        cls: "onprogram-project-task-manager-empty"
      });
      return;
    }

    const list = section.createDiv({ cls: "onprogram-project-task-picker" });
    for (const task of available) {
      const row = list.createDiv({ cls: "onprogram-project-task-picker-row" });
      const info = row.createDiv({ cls: "onprogram-project-task-row-text" });
      info.createDiv({ text: task.title, cls: "onprogram-project-task-title" });
      info.createDiv({
        text: task.project ? `Currently: ${task.project}` : "Unassigned",
        cls: "onprogram-project-task-status"
      });

      const add = row.createEl("button", { text: task.project ? "Move here" : "Add" });
      add.disabled = this.busy;
      add.setAttr(
        "title",
        task.project
          ? `Move this task from '${task.project}' to ${this.options.project.title}`
          : `Add this task to ${this.options.project.title}`
      );
      add.addEventListener("click", () => void this.attachTask(task));
    }
  }

  private async createTask(): Promise<void> {
    const title = this.newTaskTitle.trim();
    if (!title || this.busy) return;

    await this.run(async () => {
      await this.options.onCreateTask(title);
      this.createdTasks.push({ title });
      this.newTaskTitle = "";
      new Notice(`OnProgram: Added ${title} to ${this.options.project.title}.`);
      this.render();
    });
  }

  private async attachTask(task: TaskWorkItem): Promise<void> {
    if (this.busy) return;
    await this.run(async () => {
      await this.options.onAttachTask(task);
      this.attachedPaths.add(task.source.path);
      this.render();
    });
  }

  private async detachTask(task: TaskWorkItem): Promise<void> {
    if (this.busy) return;
    await this.run(async () => {
      await this.options.onDetachTask(task);
      this.attachedPaths.delete(task.source.path);
      this.optimisticComplete.delete(task.source.path);
      this.render();
    });
  }

  private async toggleComplete(task: TaskWorkItem, completed: boolean): Promise<void> {
    if (this.busy) return;
    await this.run(async () => {
      await this.options.onToggleComplete(task, completed);
      this.optimisticComplete.set(task.source.path, completed);
      this.render();
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.modalEl.addClass("onprogram-is-busy");
    try {
      await action();
    } catch (error) {
      this.options.onError(error);
    } finally {
      this.busy = false;
      this.modalEl.removeClass("onprogram-is-busy");
    }
  }
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
