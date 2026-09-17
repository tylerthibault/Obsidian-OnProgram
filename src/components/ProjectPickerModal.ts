import { Modal, type App } from "obsidian";
import type { ProjectWorkItem, WorkItem } from "../models/work-item/WorkItem";
import { projectReferenceMatches } from "../services/projects/ProjectRollup";

export interface ProjectPickerModalOptions {
  item: WorkItem;
  projects: ProjectWorkItem[];
  onSelect: (project: ProjectWorkItem) => Promise<void>;
  onRemove: () => Promise<void>;
  onError: (error: unknown) => void;
}

/** Searchable project picker shared by Board, Calendar, Timeline, and Inspector. */
export class ProjectPickerModal extends Modal {
  private search = "";
  private busy = false;

  constructor(
    app: App,
    private readonly options: ProjectPickerModalOptions
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("onprogram-project-picker-modal");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: `Choose project — ${this.options.item.title}` });
    contentEl.createEl("p", {
      text: "Assign this work item to a project. The relationship is stored on the Markdown file and is shared by every OnProgram view.",
      cls: "onprogram-project-picker-description"
    });

    if (this.options.item.project) {
      const current = contentEl.createDiv({ cls: "onprogram-project-picker-current" });
      const currentText = current.createDiv();
      currentText.createEl("strong", { text: "Current project" });
      currentText.createDiv({ text: displayReference(this.options.item.project) });
      const remove = current.createEl("button", { text: "Remove" });
      remove.disabled = this.busy;
      remove.addEventListener("click", () => void this.removeProject());
    }

    const search = contentEl.createEl("input", {
      type: "search",
      cls: "onprogram-project-picker-search"
    });
    search.placeholder = "Search projects…";
    search.value = this.search;
    search.addEventListener("input", () => {
      this.search = search.value;
      this.render();
      const refreshed = this.contentEl.querySelector<HTMLInputElement>(".onprogram-project-picker-search");
      refreshed?.focus();
      if (refreshed) refreshed.setSelectionRange(refreshed.value.length, refreshed.value.length);
    });

    const query = this.search.trim().toLowerCase();
    const projects = this.options.projects
      .filter((project) => !query || project.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (this.options.projects.length === 0) {
      contentEl.createDiv({
        text: "There are no projects in this OnProgram Base yet. Create one from the Projects view first.",
        cls: "onprogram-project-picker-empty"
      });
      return;
    }

    if (projects.length === 0) {
      contentEl.createDiv({
        text: "No matching projects.",
        cls: "onprogram-project-picker-empty"
      });
      return;
    }

    const list = contentEl.createDiv({ cls: "onprogram-project-picker-list" });
    for (const project of projects) {
      const isCurrent = Boolean(
        this.options.item.project
        && projectReferenceMatches(this.options.item.project, project)
      );

      const row = list.createEl("button", {
        cls: `onprogram-project-picker-row${isCurrent ? " is-current" : ""}`
      });
      row.disabled = this.busy;
      const text = row.createDiv({ cls: "onprogram-project-picker-row-text" });
      text.createDiv({ text: project.title, cls: "onprogram-project-picker-title" });
      text.createDiv({
        text: `${humanize(project.status)} · ${humanize(project.priority)}`,
        cls: "onprogram-project-picker-meta"
      });
      row.createSpan({
        text: isCurrent ? "✓" : "",
        cls: "onprogram-project-picker-check"
      });
      row.addEventListener("click", () => {
        if (isCurrent) {
          this.close();
          return;
        }
        void this.selectProject(project);
      });
    }
  }

  private async selectProject(project: ProjectWorkItem): Promise<void> {
    if (this.busy) return;

    if (this.options.item.project) {
      const currentIsTarget = projectReferenceMatches(this.options.item.project, project);
      if (!currentIsTarget) {
        const confirmed = window.confirm(
          `Move '${this.options.item.title}' from '${displayReference(this.options.item.project)}' to '${project.title}'?`
        );
        if (!confirmed) return;
      }
    }

    await this.run(async () => {
      await this.options.onSelect(project);
      this.close();
    });
  }

  private async removeProject(): Promise<void> {
    if (this.busy) return;
    await this.run(async () => {
      await this.options.onRemove();
      this.close();
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

function displayReference(reference: string): string {
  return reference
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .split("/")
    .pop() ?? reference;
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
