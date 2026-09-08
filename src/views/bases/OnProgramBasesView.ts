import { BasesView, type QueryController } from "obsidian";

export const ONPROGRAM_BASES_VIEW_ID = "onprogram";

/**
 * Foundation view for native Obsidian Bases integration.
 *
 * This intentionally renders a simple inspector in Sprint 4.1. Later Calendar,
 * Timeline, and other OnProgram renderers will consume the same BasesQueryResult
 * contract instead of reimplementing Base filters or file selection.
 */
export class OnProgramBasesView extends BasesView {
  type = ONPROGRAM_BASES_VIEW_ID;

  constructor(
    controller: QueryController,
    private readonly hostEl: HTMLElement
  ) {
    super(controller);
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    this.hostEl.empty();
    this.hostEl.addClass("onprogram-bases-view");

    const header = this.hostEl.createDiv({ cls: "onprogram-bases-header" });
    header.createEl("h3", { text: "OnProgram" });
    header.createEl("span", {
      text: `${this.data.data.length} ${this.data.data.length === 1 ? "item" : "items"}`,
      cls: "onprogram-bases-count"
    });

    const propertyLine = this.hostEl.createDiv({ cls: "onprogram-bases-properties" });
    propertyLine.setText(
      this.data.properties.length > 0
        ? `Base properties: ${this.data.properties.join(", ")}`
        : "No visible Base properties configured."
    );

    if (this.data.data.length === 0) {
      this.hostEl.createDiv({
        text: "This Base query currently returns no files.",
        cls: "onprogram-bases-empty"
      });
      return;
    }

    const list = this.hostEl.createDiv({ cls: "onprogram-bases-list" });
    for (const entry of this.data.data) {
      const row = list.createDiv({ cls: "onprogram-bases-row" });
      const button = row.createEl("button", {
        text: entry.file.basename,
        cls: "onprogram-bases-file"
      });
      button.addEventListener("click", () => {
        void this.app.workspace.getLeaf(false).openFile(entry.file);
      });
      row.createSpan({ text: entry.file.path, cls: "onprogram-bases-path" });
    }
  }
}
