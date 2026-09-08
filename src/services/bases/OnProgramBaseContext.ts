import { TFile, TFolder, normalizePath, parseYaml, type App } from "obsidian";

interface BaseViewConfigShape {
  type?: unknown;
  taskFolder?: unknown;
}

interface BaseConfigShape {
  views?: unknown;
}

/**
 * Resolves the folder owned by the currently active OnProgram Base.
 *
 * The primary path is an active .base file whose OnProgram view config contains
 * taskFolder. As a convenience, when the active file is a Markdown task inside a
 * canonical <project>/files directory, the sibling OnProgram Base is also
 * detected so the global Create task command stays in that project context.
 */
export class OnProgramBaseContext {
  constructor(private readonly app: App) {}

  async resolveActiveTaskFolder(): Promise<string | undefined> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return undefined;

    if (activeFile.extension === "base") {
      return this.readTaskFolderFromBase(activeFile);
    }

    if (activeFile.extension === "md") {
      return this.resolveFromTaskFile(activeFile);
    }

    return undefined;
  }

  private async resolveFromTaskFile(file: TFile): Promise<string | undefined> {
    const filesFolder = file.parent;
    if (!(filesFolder instanceof TFolder) || filesFolder.name !== "files") {
      return undefined;
    }

    const ownerFolder = filesFolder.parent;
    if (!(ownerFolder instanceof TFolder)) {
      return undefined;
    }

    const expectedBaseName = ownerFolder.path
      ? `${ownerFolder.name}.onprogram.base`
      : "OnProgram.base";
    const basePath = normalizePath(
      `${ownerFolder.path ? `${ownerFolder.path}/` : ""}${expectedBaseName}`
    );
    const baseFile = this.app.vault.getAbstractFileByPath(basePath);
    if (!(baseFile instanceof TFile)) {
      return undefined;
    }

    return (await this.readTaskFolderFromBase(baseFile)) ?? filesFolder.path;
  }

  private async readTaskFolderFromBase(file: TFile): Promise<string | undefined> {
    try {
      const parsed = parseYaml(await this.app.vault.cachedRead(file)) as BaseConfigShape | null;
      if (!parsed || !Array.isArray(parsed.views)) {
        return undefined;
      }

      for (const rawView of parsed.views) {
        if (!isRecord(rawView)) continue;
        const view = rawView as BaseViewConfigShape;
        if (typeof view.type !== "string" || !view.type.startsWith("onprogram-")) {
          continue;
        }

        if (typeof view.taskFolder === "string" && view.taskFolder.trim()) {
          return normalizePath(view.taskFolder.trim());
        }
      }
    } catch {
      // Invalid or temporarily incomplete Base YAML should not break global task
      // creation. The caller can safely fall back to the configured global folder.
    }

    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
