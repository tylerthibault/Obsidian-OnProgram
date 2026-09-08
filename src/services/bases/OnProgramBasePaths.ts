import { normalizePath, type TFolder } from "obsidian";

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

export function onProgramFilesFolder(folder: TFolder): string {
  const folderPath = normalizeOnProgramOwnerPath(folder.path);
  return normalizePath(`${folderPath ? `${folderPath}/` : ""}files`);
}
