import { TFile, TFolder, normalizePath, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import {
  validateWorkItemPropertyMap,
  type WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { resolveOnProgramViewTaskFolder } from "../bases/OnProgramBasePaths";

export interface WorkItemCreationConfig {
  taskFolderMode: "current-base" | "custom";
  taskFolder: string;
  taskTemplatePath: string;
  defaultProject: string;
  propertyMap: WorkItemPropertyMap;
}

interface CreationKindOptions {
  label: string;
  folderConflictCode: string;
  filenameExhaustedCode: string;
  invalidPropertyMapCode: string;
}

interface FolderResolutionOptions {
  unresolvedMessage: string;
  unresolvedCode: string;
}

interface TitleNormalizationOptions {
  label: string;
  emptyCode: string;
  invalidCode: string;
}

export function normalizeWorkItemTitle(
  value: string,
  options: TitleNormalizationOptions
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new OnProgramError(
      `${options.label} title cannot be empty.`,
      options.emptyCode
    );
  }

  const sanitized = trimmed
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim();

  if (!sanitized) {
    throw new OnProgramError(
      `${options.label} title does not contain a usable filename.`,
      options.invalidCode
    );
  }

  return sanitized;
}

export function normalizeWorkItemFolder(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return normalizeVaultPath(trimmed, "task folder");
}

export function normalizeVaultPath(value: string, label: string): string {
  const slashNormalized = value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segments = slashNormalized.split("/").filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new OnProgramError(
      `The ${label} cannot contain '.' or '..' path segments.`,
      "invalid-vault-path"
    );
  }

  if (segments.length === 0) return "";
  return normalizePath(segments.join("/"));
}

export function resolveCreationFolder(
  app: App,
  config: WorkItemCreationConfig,
  targetFolder: string | undefined,
  options: FolderResolutionOptions
): string {
  if (config.taskFolderMode === "custom") {
    return normalizeWorkItemFolder(config.taskFolder);
  }

  const contextualFolder = resolveOnProgramViewTaskFolder(app, targetFolder);
  if (!contextualFolder) {
    throw new OnProgramError(options.unresolvedMessage, options.unresolvedCode);
  }

  return normalizeWorkItemFolder(contextualFolder);
}

export async function ensureCreationFolder(
  app: App,
  folder: string,
  options: Pick<CreationKindOptions, "label" | "folderConflictCode">
): Promise<void> {
  if (!folder) return;

  const segments = folder.split("/").filter(Boolean);
  let current = "";

  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(current);

    if (!existing) {
      await app.vault.createFolder(current);
      continue;
    }

    if (!(existing instanceof TFolder)) {
      throw new OnProgramError(
        `Cannot create ${options.label.toLowerCase()} folder because '${current}' is a file.`,
        options.folderConflictCode
      );
    }
  }
}

export function findAvailableMarkdownPath(
  app: App,
  folder: string,
  title: string,
  options: Pick<CreationKindOptions, "label" | "filenameExhaustedCode">
): string {
  const makePath = (suffix: string): string =>
    normalizePath(`${folder ? `${folder}/` : ""}${title}${suffix}.md`);

  const first = makePath("");
  if (!app.vault.getAbstractFileByPath(first)) return first;

  for (let index = 2; index <= 9999; index += 1) {
    const candidate = makePath(` ${index}`);
    if (!app.vault.getAbstractFileByPath(candidate)) return candidate;
  }

  throw new OnProgramError(
    `Unable to find an available filename for ${options.label.toLowerCase()} '${title}'.`,
    options.filenameExhaustedCode
  );
}

export function assertSafeCreationPropertyMap(
  propertyMap: WorkItemPropertyMap,
  options: Pick<CreationKindOptions, "label" | "invalidPropertyMapCode">
): void {
  const issues = validateWorkItemPropertyMap(propertyMap);
  if (issues.length === 0) return;

  throw new OnProgramError(
    `Cannot create a ${options.label.toLowerCase()} with the current property mapping: ${issues
      .map((issue) => issue.message)
      .join(" ")}`,
    options.invalidPropertyMapCode
  );
}

export async function createInitializedMarkdownFile(
  app: App,
  path: string,
  content: string,
  initialize: (file: TFile) => Promise<void>
): Promise<TFile> {
  const file = await app.vault.create(path, content);

  try {
    await initialize(file);
    return file;
  } catch (error) {
    try {
      await app.vault.delete(file);
    } catch {
      // Preserve the initialization failure; it is more actionable than cleanup failure.
    }
    throw error;
  }
}

export function setFrontmatterDefault(
  frontmatter: Record<string, unknown>,
  property: string,
  value: unknown
): void {
  if (!Object.prototype.hasOwnProperty.call(frontmatter, property)) {
    frontmatter[property] = value;
  }
}
