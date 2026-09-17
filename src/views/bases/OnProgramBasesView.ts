import { BasesView, Menu, type QueryController } from "obsidian";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { ProjectAssignmentService } from "../../services/projects/ProjectAssignmentService";

export const ONPROGRAM_BASES_VIEW_ID = "onprogram";

/** Native OnProgram view rendered inside Obsidian Bases. */
export class OnProgramBasesView extends BasesView {
  type = ONPROGRAM_BASES_VIEW_ID;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement,
    private readonly adapter: BasesWorkItemAdapter,
    private readonly projectAssignment: ProjectAssignmentService
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-bases-view");

    const adapted = this.adapter.adapt(this.data);
    const groups = this.adapter.adaptGroups(this.data);

    const header = this.hostEl.createDiv({ cls: "onprogram-bases-header" });
    header.createEl("h3", { text: "OnProgram" });
    header.createEl("span", {
      text: `${adapted.items.length} work ${adapted.items.length === 1 ? "item" : "items"}`,
      cls: "onprogram-bases-count"
    });

    const summary = this.hostEl.createDiv({ cls: "onprogram-bases-summary" });
    summary.createSpan({ text: `${this.data.data.length} Base rows` });
    summary.createSpan({ text: `${adapted.invalid.length} invalid` });
    summary.createSpan({ text: `${adapted.ignoredPaths.length} ordinary notes` });
    summary.createSpan({ text: `${groups.length} ${groups.length === 1 ? "group" : "groups"}` });

    const propertyLine = this.hostEl.createDiv({ cls: "onprogram-bases-properties" });
    propertyLine.setText(
      this.data.properties.length > 0
        ? `Visible Base properties: ${this.data.properties.join(", ")}`
        : "No visible Base properties configured."
    );

    if (adapted.invalid.length > 0) {
      const invalid = this.hostEl.createDiv({ cls: "onprogram-bases-invalid" });
      invalid.createEl("strong", { text: "Invalid work items" });
      const list = invalid.createEl("ul");
      for (const entry of adapted.invalid) {
        list.createEl("li", {
          text: `${entry.path}: ${entry.issues.map((issue) => issue.message).join(" ")}`
        });
      }
    }

    if (adapted.items.length === 0) {
      this.hostEl.createDiv({
        text: "This Base currently contains no valid OnProgram work items.",
        cls: "onprogram-bases-empty"
      });
      return;
    }

    const list = this.hostEl.createDiv({ cls: "onprogram-bases-list" });
    for (const item of adapted.items) {
      const row = list.createDiv({ cls: "onprogram-bases-row" });
      row.addEventListener("contextmenu", (event) => {
        if (item.type === "project") return;
        event.preventDefault();
        const menu = new Menu();
        this.projectAssignment.addProjectMenuItem(menu, item);
        menu.showAtMouseEvent(event);
      });

      const button = row.createEl("button", {
        text: item.title,
        cls: "onprogram-bases-file"
      });
      button.addEventListener("click", () => {
        const entry = this.data.data.find((candidate) => candidate.file.path === item.source.path);
        if (entry) void this.app.workspace.getLeaf(false).openFile(entry.file);
      });

      const meta = row.createDiv({ cls: "onprogram-bases-row-meta" });
      meta.createSpan({ text: item.type });
      meta.createSpan({ text: item.status });
      meta.createSpan({ text: item.priority });
      if (item.project) meta.createSpan({ text: item.project });
      row.createDiv({ text: item.source.path, cls: "onprogram-bases-path" });
    }
  }
}
