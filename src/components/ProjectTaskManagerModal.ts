import { Modal, Notice, Setting, type App } from "obsidian";
import { humanize } from "../utils/text";
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
  private operationQueue: Promise<void> = Promise.resolve();
  private readonly attachedPaths = new Set<string>();
  private readonly optimisticComplete = new Map<string, boolean>();
  private readonly projectOverrides = new Map<string, string | undefined>();
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

    const style = contentEl.createEl("style");
    style.textContent = TASK_MANAGER_STYLES;

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
      checkbox.disabled = LOCKED_COMPLETE_STATUSES.has(task.status);
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
        text: optimistic === undefined
          ? humanize(task.status)
          : optimistic ? "Done" : "Todo",
        cls: "onprogram-project-task-status"
      });

      const detach = row.createEl("button", { text: "Remove" });
      detach.setAttr("title", "Remove this task from the project without deleting it");
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
    section.createDiv({
      text: "Unassigned tasks can be added directly. A task that already belongs to another project can be moved here.",
      cls: "onprogram-project-task-manager-hint"
    });

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
      const currentProject = this.projectFor(task);
      const row = list.createDiv({ cls: "onprogram-project-task-picker-row" });
      const info = row.createDiv({ cls: "onprogram-project-task-row-text" });
      info.createDiv({ text: task.title, cls: "onprogram-project-task-title" });
      info.createDiv({
        text: currentProject ? `Currently: ${displayReference(currentProject)}` : "Unassigned",
        cls: "onprogram-project-task-status"
      });

      const add = row.createEl("button", { text: currentProject ? "Move here" : "Add" });
      add.setAttr(
        "title",
        currentProject
          ? `Move this task from '${displayReference(currentProject)}' to ${this.options.project.title}`
          : `Add this task to ${this.options.project.title}`
      );
      add.addEventListener("click", () => void this.attachTask(task));
    }
  }

  private async createTask(): Promise<void> {
    const title = this.newTaskTitle.trim();
    if (!title) return;

    await this.run(async () => {
      await this.options.onCreateTask(title);
      this.createdTasks.push({ title });
      this.newTaskTitle = "";
      new Notice(`OnProgram: Added ${title} to ${this.options.project.title}.`);
    });
  }

  private async attachTask(task: TaskWorkItem): Promise<void> {
    const currentProject = this.projectFor(task);
    const alreadyHere = Boolean(
      currentProject && projectReferenceMatches(currentProject, this.options.project)
    );

    if (currentProject && !alreadyHere) {
      const confirmed = window.confirm(
        `'${task.title}' is currently assigned to ${displayReference(currentProject)}. Move it to ${this.options.project.title}?`
      );
      if (!confirmed) return;
    }

    await this.run(async () => {
      await this.options.onAttachTask(task);
      this.attachedPaths.add(task.source.path);
      this.projectOverrides.set(task.source.path, this.options.project.title);
    });
  }

  private async detachTask(task: TaskWorkItem): Promise<void> {
    await this.run(async () => {
      await this.options.onDetachTask(task);
      this.attachedPaths.delete(task.source.path);
      this.optimisticComplete.delete(task.source.path);
      this.projectOverrides.set(task.source.path, undefined);
    });
  }

  private async toggleComplete(task: TaskWorkItem, completed: boolean): Promise<void> {
    await this.run(async () => {
      await this.options.onToggleComplete(task, completed);
      this.optimisticComplete.set(task.source.path, completed);
    });
  }

  private projectFor(task: TaskWorkItem): string | undefined {
    if (this.projectOverrides.has(task.source.path)) {
      return this.projectOverrides.get(task.source.path);
    }
    return task.project;
  }

  /**
   * Serialize mutations without disabling the modal. WorkItemWriter already
   * serializes writes per file; this queue also keeps the modal's optimistic
   * UI state ordered while allowing the next control to remain clickable.
   */
  private async run(action: () => Promise<void>): Promise<void> {
    const scrollTop = this.contentEl.scrollTop;

    const operation = this.operationQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await action();
        } catch (error) {
          this.options.onError(error);
        } finally {
          this.render();
          this.contentEl.scrollTop = scrollTop;
        }
      });

    this.operationQueue = operation.then(() => undefined, () => undefined);
    await operation;
  }
}

function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}

const TASK_MANAGER_STYLES = `
.onprogram-project-task-manager-modal {
  width: min(760px, calc(100vw - 32px));
}

.onprogram-project-task-manager-modal .modal-content {
  max-height: min(78vh, 820px);
  overflow: auto;
}

.onprogram-project-task-manager-description,
.onprogram-project-task-manager-hint,
.onprogram-project-task-status,
.onprogram-project-task-manager-count,
.onprogram-project-task-manager-empty {
  color: var(--text-muted);
}

.onprogram-project-task-manager-description {
  margin-top: calc(var(--size-4-1) * -1);
}

.onprogram-project-task-manager-section {
  padding: var(--size-4-3) 0;
  border-top: 1px solid var(--background-modifier-border);
}

.onprogram-project-task-manager-section:first-of-type {
  border-top: 0;
}

.onprogram-project-task-manager-section h3 {
  margin: 0 0 var(--size-4-2);
  font-size: var(--font-ui-medium);
}

.onprogram-project-task-manager-section-header,
.onprogram-project-task-row,
.onprogram-project-task-picker-row,
.onprogram-project-task-row-main {
  display: flex;
  align-items: center;
}

.onprogram-project-task-manager-section-header {
  justify-content: space-between;
  gap: var(--size-4-2);
}

.onprogram-project-task-manager-count,
.onprogram-project-task-status,
.onprogram-project-task-manager-hint {
  font-size: var(--font-ui-smaller);
}

.onprogram-project-task-manager-hint {
  margin: calc(var(--size-4-1) * -1) 0 var(--size-4-2);
}

.onprogram-project-task-checklist,
.onprogram-project-task-picker {
  display: grid;
  gap: var(--size-4-1);
}

.onprogram-project-task-row,
.onprogram-project-task-picker-row {
  justify-content: space-between;
  gap: var(--size-4-3);
  min-height: 46px;
  padding: var(--size-4-2);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}

.onprogram-project-task-row-main {
  gap: var(--size-4-2);
  min-width: 0;
  flex: 1 1 auto;
}

.onprogram-project-task-row-main input[type=\"checkbox\"] {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.onprogram-project-task-row-text {
  min-width: 0;
  flex: 1 1 auto;
}

.onprogram-project-task-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-normal);
  font-weight: var(--font-medium);
}

.onprogram-project-task-title.is-complete {
  color: var(--text-muted);
  text-decoration: line-through;
}

.onprogram-project-task-search {
  width: 100%;
  margin-bottom: var(--size-4-2);
}

.onprogram-project-task-manager-empty {
  padding: var(--size-4-3);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-s);
  text-align: center;
}

@media (max-width: 600px) {
  .onprogram-project-task-row,
  .onprogram-project-task-picker-row {
    align-items: stretch;
    flex-direction: column;
  }

  .onprogram-project-task-row > button,
  .onprogram-project-task-picker-row > button {
    align-self: flex-start;
  }
}
`;
