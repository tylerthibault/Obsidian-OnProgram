import { Modal, setIcon, type App } from "obsidian";
import { PROJECT_PICKER_STYLES } from "./styles/ProjectPickerStyles";
import { humanize } from "../utils/text";
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
    const style = this.modalEl.createEl("style");
    style.textContent = PROJECT_PICKER_STYLES;
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    const header = contentEl.createDiv({ cls: "onprogram-project-picker-header" });
    header.createEl("h2", { text: "Assign project" });
    header.createDiv({
      text: this.options.item.title,
      cls: "onprogram-project-picker-item-title"
    });

    const searchShell = contentEl.createDiv({ cls: "onprogram-project-picker-search-shell" });
    const searchIcon = searchShell.createSpan({ cls: "onprogram-project-picker-search-icon" });
    setIcon(searchIcon, "search");
    const search = searchShell.createEl("input", {
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

    const list = contentEl.createDiv({ cls: "onprogram-project-picker-list" });
    const query = this.search.trim().toLowerCase();
    const projects = this.options.projects
      .filter((project) => !query || project.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title));

    if (projects.length > 0) {
      for (const project of projects) this.renderProjectRow(list, project);
    } else {
      list.createDiv({
        text: this.options.projects.length === 0
          ? "No projects yet. Create one from the Projects view first."
          : "No matching projects.",
        cls: "onprogram-project-picker-empty"
      });
    }

    if (this.options.item.project) {
      const divider = list.createDiv({ cls: "onprogram-project-picker-divider" });
      divider.setAttr("aria-hidden", "true");

      const none = list.createEl("button", {
        cls: "onprogram-project-picker-row onprogram-project-picker-none"
      });
      none.disabled = this.busy;
      const icon = none.createSpan({ cls: "onprogram-project-picker-row-icon" });
      setIcon(icon, "unlink");
      const text = none.createDiv({ cls: "onprogram-project-picker-row-text" });
      text.createDiv({ text: "No project", cls: "onprogram-project-picker-title" });
      text.createDiv({
        text: "Remove project assignment",
        cls: "onprogram-project-picker-meta"
      });
      none.addEventListener("click", () => void this.removeProject());
    }
  }

  private renderProjectRow(parent: HTMLElement, project: ProjectWorkItem): void {
    const isCurrent = Boolean(
      this.options.item.project
      && projectReferenceMatches(this.options.item.project, project)
    );

    const row = parent.createEl("button", {
      cls: `onprogram-project-picker-row${isCurrent ? " is-current" : ""}`
    });
    row.disabled = this.busy;
    row.setAttr("aria-current", isCurrent ? "true" : "false");

    const icon = row.createSpan({ cls: "onprogram-project-picker-row-icon" });
    setIcon(icon, "folder-kanban");

    const text = row.createDiv({ cls: "onprogram-project-picker-row-text" });
    text.createDiv({ text: project.title, cls: "onprogram-project-picker-title" });
    text.createDiv({
      text: `${humanize(project.status)} · ${humanize(project.priority)}`,
      cls: "onprogram-project-picker-meta"
    });

    const check = row.createSpan({ cls: "onprogram-project-picker-check" });
    if (isCurrent) setIcon(check, "check");

    row.addEventListener("click", () => {
      if (isCurrent) {
        this.close();
        return;
      }
      void this.selectProject(project);
    });
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

