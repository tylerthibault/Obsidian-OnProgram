import { Modal, setIcon, type App } from "obsidian";
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

const PROJECT_PICKER_STYLES = `
.onprogram-project-picker-modal {
  width: min(560px, calc(100vw - 32px));
}

.onprogram-project-picker-modal .modal-content {
  padding: 28px;
}

.onprogram-project-picker-header {
  margin: 0 0 20px;
  padding-right: 34px;
}

.onprogram-project-picker-header h2 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.onprogram-project-picker-item-title {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-search-shell {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.onprogram-project-picker-search-icon {
  position: absolute;
  left: 12px;
  z-index: 1;
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.onprogram-project-picker-search {
  width: 100%;
  height: 40px;
  margin: 0;
  padding-left: 38px !important;
  border-radius: var(--radius-m);
  box-sizing: border-box;
}

.onprogram-project-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: min(430px, 58vh);
  overflow-y: auto;
  padding: 2px;
}

.onprogram-project-picker-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 24px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-m);
  background: transparent;
  box-shadow: none;
  color: var(--text-normal);
  text-align: left;
  cursor: pointer;
}

.onprogram-project-picker-row:hover,
.onprogram-project-picker-row:focus-visible {
  border-color: var(--background-modifier-border);
  background: var(--background-modifier-hover);
  box-shadow: none;
}

.onprogram-project-picker-row.is-current {
  border-color: color-mix(in srgb, var(--interactive-accent) 46%, var(--background-modifier-border));
  background: color-mix(in srgb, var(--interactive-accent) 10%, transparent);
}

.onprogram-project-picker-row-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-s);
  background: var(--background-secondary);
  color: var(--text-muted);
}

.onprogram-project-picker-row.is-current .onprogram-project-picker-row-icon {
  color: var(--interactive-accent);
}

.onprogram-project-picker-row-text {
  min-width: 0;
  padding: 0 8px;
}

.onprogram-project-picker-title {
  overflow: hidden;
  color: var(--text-normal);
  font-size: var(--font-ui-medium);
  font-weight: var(--font-semibold);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-meta {
  margin-top: 3px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-normal);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.onprogram-project-picker-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--interactive-accent);
}

.onprogram-project-picker-divider {
  height: 1px;
  margin: 8px 6px 4px;
  background: var(--background-modifier-border);
}

.onprogram-project-picker-none .onprogram-project-picker-row-icon {
  background: transparent;
}

.onprogram-project-picker-none:hover .onprogram-project-picker-title {
  color: var(--text-error);
}

.onprogram-project-picker-empty {
  padding: 24px 14px;
  color: var(--text-muted);
  font-size: var(--font-ui-small);
  text-align: center;
}

.onprogram-project-picker-modal.onprogram-is-busy .onprogram-project-picker-list,
.onprogram-project-picker-modal.onprogram-is-busy .onprogram-project-picker-search-shell {
  opacity: 0.62;
  pointer-events: none;
}

@media (max-width: 520px) {
  .onprogram-project-picker-modal .modal-content {
    padding: 22px 18px;
  }
}
`;
