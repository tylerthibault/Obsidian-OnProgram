import { TFile, getFrontMatterInfo, normalizePath, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemDateValue } from "../../models/work-item/WorkItemDates";
import type { WorkItemPriority } from "../../models/work-item/WorkItemPriority";
import type { WorkItemStatus } from "../../models/work-item/WorkItemStatus";
import { normalizeTaskTitle } from "./TaskCreator";
import {
  normalizeDurationMinutes,
  normalizeWorkItemDate
} from "./WorkItemValueNormalizer";
import type { WorkItemWritePatch } from "./WorkItemWritePatch";
import { WorkItemWriter } from "./WorkItemWriter";

export interface WorkItemEditorDraft {
  title: string;
  status: WorkItemStatus;
  project: string;
  priority: WorkItemPriority;
  start: string;
  due: string;
  scheduled: string;
  duration: string;
  notes: string;
}

export interface SaveWorkItemEditorRequest {
  item: WorkItem;
  draft: WorkItemEditorDraft;
}

export interface SaveWorkItemEditorResult {
  file: TFile;
  path: string;
  renamed: boolean;
}

export class WorkItemEditorService {
  constructor(
    private readonly app: App,
    private readonly writer: WorkItemWriter
  ) {}

  async loadDraft(item: WorkItem): Promise<WorkItemEditorDraft> {
    const file = this.resolveFile(item.source.path);
    const content = await this.app.vault.read(file);

    return {
      title: item.title,
      status: item.status,
      project: item.project ?? "",
      priority: item.priority,
      start: item.dates.start?.iso ?? "",
      due: item.dates.due?.iso ?? "",
      scheduled: item.dates.scheduled?.iso ?? "",
      duration: item.durationMinutes ? String(item.durationMinutes) : "",
      notes: extractNotes(content)
    };
  }

  async save(request: SaveWorkItemEditorRequest): Promise<SaveWorkItemEditorResult> {
    const { item, draft } = request;
    const originalFile = this.resolveFile(item.source.path);
    const originalContent = await this.app.vault.read(originalFile);

    if (originalFile.stat.mtime !== item.source.mtime) {
      throw new OnProgramError(
        `The file changed after OnProgram opened the editor. Reload before saving: ${originalFile.path}`,
        "work-item-edit-conflict"
      );
    }

    const desiredTitle = normalizeTaskTitle(draft.title);
    const targetPath = this.validateRenameTarget(originalFile, desiredTitle);
    const patch = this.buildPatch(item, draft);

    await this.writer.updateItem(item, patch);

    let file = this.resolveFile(item.source.path);
    await this.writeNotes(file, extractNotes(originalContent), draft.notes);

    const renamed = targetPath !== file.path;
    if (renamed) {
      await this.app.fileManager.renameFile(file, targetPath);
      file = this.resolveFile(targetPath);
    }

    return { file, path: file.path, renamed };
  }

  async archive(item: WorkItem): Promise<void> {
    await this.writer.updateItem(item, { status: "archived" });
  }

  async trash(item: WorkItem): Promise<void> {
    const file = this.resolveFile(item.source.path);
    if (file.stat.mtime !== item.source.mtime) {
      throw new OnProgramError(
        `The file changed after OnProgram read it. Reload before moving it to Trash: ${file.path}`,
        "work-item-edit-conflict"
      );
    }

    await this.app.fileManager.trashFile(file);
  }

  async openSource(item: WorkItem): Promise<void> {
    const file = this.resolveFile(item.source.path);
    await this.app.workspace.getLeaf(false).openFile(file);
  }

  private validateRenameTarget(file: TFile, desiredTitle: string): string {
    if (desiredTitle === file.basename) {
      return file.path;
    }

    const parentPath = file.parent?.path ?? "";
    const targetPath = normalizePath(`${parentPath ? `${parentPath}/` : ""}${desiredTitle}.md`);
    const existing = this.app.vault.getAbstractFileByPath(targetPath);
    if (existing && existing !== file) {
      throw new OnProgramError(
        `A note named '${desiredTitle}.md' already exists in this folder.`,
        "work-item-rename-conflict"
      );
    }

    return targetPath;
  }

  private buildPatch(item: WorkItem, draft: WorkItemEditorDraft): WorkItemWritePatch {
    return {
      status: draft.status,
      priority: draft.priority,
      project: optionalString(draft.project),
      start: parseOptionalDate(draft.start, "start"),
      due: this.requiredAwareDate(item.type === "milestone", draft.due, "due"),
      scheduled: this.requiredAwareDate(item.type === "event", draft.scheduled, "scheduled"),
      durationMinutes: parseOptionalDuration(draft.duration)
    };
  }

  private requiredAwareDate(
    required: boolean,
    value: string,
    label: "due" | "scheduled"
  ): WorkItemDateValue | null {
    const trimmed = value.trim();
    if (!trimmed) {
      if (required) {
        throw new OnProgramError(
          `${label === "due" ? "Due" : "Scheduled"} is required for this work item.`,
          "required-work-item-property"
        );
      }
      return null;
    }

    return parseDate(trimmed, label);
  }

  private async writeNotes(file: TFile, originalNotes: string, notes: string): Promise<void> {
    if (notes === originalNotes) {
      return;
    }

    const currentContent = await this.app.vault.read(file);
    if (extractNotes(currentContent) !== originalNotes) {
      throw new OnProgramError(
        `The note body changed while the editor was open. Reload before saving: ${file.path}`,
        "work-item-edit-conflict"
      );
    }

    await this.app.vault.process(file, (content) => {
      const info = getFrontMatterInfo(content);
      if (!info.exists) {
        return notes;
      }

      const frontmatterBlock = content.slice(0, info.contentStart).replace(/\s*$/, "");
      return `${frontmatterBlock}\n\n${notes}`;
    });
  }

  private resolveFile(path: string): TFile {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      throw new OnProgramError(`Work item file not found: ${path}`, "work-item-file-not-found");
    }
    return file;
  }
}

function extractNotes(content: string): string {
  const info = getFrontMatterInfo(content);
  return info.exists ? content.slice(info.contentStart).replace(/^\r?\n/, "") : content;
}

function optionalString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalDate(value: string, label: string): WorkItemDateValue | null {
  const trimmed = value.trim();
  return trimmed ? parseDate(trimmed, label) : null;
}

function parseDate(value: string, label: string): WorkItemDateValue {
  const normalized = normalizeWorkItemDate(value);
  if (!normalized) {
    throw new OnProgramError(`Invalid ${label} date: ${value}`, "invalid-work-item-date");
  }
  return normalized;
}

function parseOptionalDuration(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeDurationMinutes(trimmed);
  if (normalized === undefined) {
    throw new OnProgramError(`Invalid duration: ${value}`, "invalid-work-item-duration");
  }
  return normalized;
}
