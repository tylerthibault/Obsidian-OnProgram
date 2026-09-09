import type { App, TFile } from "obsidian";

/**
 * Centralizes how OnProgram opens backing Markdown files from interactive views.
 *
 * The default experience is a vertical split so the planning surface stays
 * visible beside the note. Users can disable split opening in settings.
 */
export class WorkItemOpener {
  constructor(
    private readonly app: App,
    private readonly openInSplit: () => boolean
  ) {}

  async open(file: TFile): Promise<void> {
    const leaf = this.openInSplit()
      ? this.app.workspace.getLeaf("split", "vertical")
      : this.app.workspace.getLeaf(false);

    await leaf.openFile(file);
  }
}
