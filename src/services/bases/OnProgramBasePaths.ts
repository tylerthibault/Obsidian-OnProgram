import { normalizePath, TFile, TFolder, type App } from "obsidian";

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
 * Resolve the Tasks directory belonging to the Base/workspace context the user
 * is actually interacting with.
 *
 * Obsidian Bases does not always make workspace.getActiveFile() the most useful
 * signal while a custom Bases layout is focused, so we also inspect the active
 * and most-recent workspace leaf view for its backing file.
 */
export function resolveCurrentBaseTasksFolder(app: App): string | undefined {
  const candidates: unknown[] = [
    app.workspace.getActiveFile(),
    workspaceLeafFile((app.workspace as unknown as WorkspaceWithLeaves).activeLeaf),
    workspaceLeafFile((app.workspace as unknown as WorkspaceWithLeaves).getMostRecentLeaf?.())
  ];

  for (const candidate of candidates) {
    if (!(candidate instanceof TFile)) continue;

    if (candidate.extension === "base" && candidate.parent instanceof TFolder) {
      return onProgramTasksFolder(candidate.parent);
    }

    // When a task itself is active, preserve its owning Tasks folder rather than
    // falling back to a global folder.
    if (
      candidate.extension === "md" &&
      candidate.parent instanceof TFolder &&
      candidate.parent.name.toLowerCase() === "tasks"
    ) {
      return normalizePath(candidate.parent.path);
    }
  }

  return undefined;
}

/**
 * Resolve the destination for task creation from a Bases view.
 *
 * Current Base context wins over any stored legacy view option. The configured
 * folder remains a compatibility fallback for older generated Bases.
 */
export function resolveOnProgramViewTaskFolder(
  app: App,
  configuredTaskFolder: unknown
): string | undefined {
  const contextual = resolveCurrentBaseTasksFolder(app);
  if (contextual) return contextual;

  if (typeof configuredTaskFolder === "string" && configuredTaskFolder.trim()) {
    return normalizePath(configuredTaskFolder.trim());
  }

  return undefined;
}

/** @deprecated Use onProgramTasksFolder. Retained for compatibility with older code. */
export function onProgramFilesFolder(folder: TFolder): string {
  return onProgramTasksFolder(folder);
}

type LeafLike = {
  view?: {
    file?: unknown;
  };
} | null | undefined;

type WorkspaceWithLeaves = {
  activeLeaf?: LeafLike;
  getMostRecentLeaf?: () => LeafLike;
};

function workspaceLeafFile(leaf: LeafLike): unknown {
  return leaf?.view?.file;
}
