import { normalizePath, TFolder, type App } from "obsidian";

/** Canonical owner-folder path with Obsidian's root represented as an empty string. */
export function normalizeOnProgramOwnerPath(path: string): string {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return normalized === "." ? "" : normalized;
}

export function onProgramBasePath(folder: TFolder): string {
  const folderPath = normalizeOnProgramOwnerPath(folder.path);
  const baseName = folderPath ? `${folder.name}.onprogram` : "OnProgram";
  return normalizePath(`${folderPath ? `${folderPath}/` : ""}${baseName}.base`);
}

/** Canonical task directory owned by an OnProgram Base folder. */
export function onProgramTasksFolder(folder: TFolder): string {
  const folderPath = normalizeOnProgramOwnerPath(folder.path);
  return normalizePath(`${folderPath ? `${folderPath}/` : ""}Tasks`);
}

/**
 * Resolve the destination for task creation from a Bases view.
 *
 * The active Base wins over any stored view option. This prevents a copied,
 * renamed, or older Base from creating tasks in another project's folder.
 */
export function resolveOnProgramViewTaskFolder(
  app: App,
  configuredTaskFolder: unknown
): string | undefined {
  const activeFile = app.workspace.getActiveFile();
  if (activeFile?.extension === "base" && activeFile.parent instanceof TFolder) {
    return onProgramTasksFolder(activeFile.parent);
  }

  if (typeof configuredTaskFolder === "string" && configuredTaskFolder.trim()) {
    return normalizePath(configuredTaskFolder.trim());
  }

  return undefined;
}

/** @deprecated Use onProgramTasksFolder. Retained for compatibility with older code. */
export function onProgramFilesFolder(folder: TFolder): string {
  return onProgramTasksFolder(folder);
}
