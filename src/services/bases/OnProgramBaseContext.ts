import { TFile, TFolder, normalizePath, parseYaml, type App } from "obsidian";
import { onProgramBasePath, onProgramTasksFolder } from "./OnProgramBasePaths";

interface BaseViewConfigShape {
  type?: unknown;
  taskFolder?: unknown;
}

interface BaseConfigShape {
  views?: unknown;
}

/**
 * Resolves the task folder owned by the currently active OnProgram Base.
 *
 * The active Base's parent/Tasks directory is authoritative. Stored taskFolder
 * values are retained only as a compatibility fallback for older Bases.
 */
export class OnProgramBaseContext {
  constructor(private readonly app: App) {}

  async resolveActiveTaskFolder(): Promise<string | undefined> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return undefined;

    if (activeFile.extension === "base") {
      if (activeFile.parent instanceof TFolder) {
        return onProgramTasksFolder(activeFile.parent);
      }
      return this.readTaskFolderFromBase(activeFile);
    }

    if (activeFile.extension === "md") {
      return this.resolveFromTaskFile(activeFile);
    }

    return undefined;
  }

  private async resolveFromTaskFile(file: TFile): Promise<string | undefined> {
    const taskFolder = file.parent;
    if (!(taskFolder instanceof TFolder)) return undefined;

    if (taskFolder.name === "Tasks") {
      return normalizePath(taskFolder.path);
    }

    // Legacy compatibility for old <project>/files layouts.
    if (taskFolder.name !== "files") return undefined;

    const ownerFolder = taskFolder.parent;
    if (!(ownerFolder instanceof TFolder)) return undefined;

    const baseFile = this.app.vault.getAbstractFileByPath(onProgramBasePath(ownerFolder));
    if (!(baseFile instanceof TFile)) return undefined;

    return (await this.readTaskFolderFromBase(baseFile)) ?? normalizePath(taskFolder.path);
  }

  private async readTaskFolderFromBase(file: TFile): Promise<string | undefined> {
    try {
      const parsed = parseYaml(await this.app.vault.cachedRead(file)) as BaseConfigShape | null;
      if (!parsed || !Array.isArray(parsed.views)) return undefined;

      for (const rawView of parsed.views) {
        if (!isRecord(rawView)) continue;
        const view = rawView as BaseViewConfigShape;
        if (typeof view.type !== "string" || !view.type.startsWith("onprogram-")) continue;

        if (typeof view.taskFolder === "string" && view.taskFolder.trim()) {
          return normalizePath(view.taskFolder.trim());
        }
      }
    } catch {
      // Invalid or temporarily incomplete Base YAML should not break task creation.
    }

    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
