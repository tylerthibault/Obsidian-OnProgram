import { parseYaml, TFile, type App } from "obsidian";
import {
  createLinkedMarkdownInstanceId,
  parseLinkedMarkdownInstances,
  serializeLinkedMarkdownInstances,
  type LinkedMarkdownInstance
} from "../links/LinkedMarkdownInstance";
import { resolveCurrentOnProgramBaseFile } from "./OnProgramBasePaths";

const CALENDAR_VIEW_TYPE = "onprogram-calendar";
const LINKED_INSTANCES_KEY = "linkedMarkdownInstances";

export class LinkedMarkdownInstanceStore {
  constructor(private readonly app: App) {}

  async addToActiveBase(input: {
    targetPath: string;
    scheduled: string;
    label?: string;
    durationMinutes?: number;
  }): Promise<LinkedMarkdownInstance> {
    const baseFile = this.resolveActiveBaseFile();
    if (!baseFile) {
      throw new Error(
        "Open an OnProgram Base or one of its Tasks before creating a linked instance."
      );
    }

    const instances = await this.readFromBase(baseFile);
    const instance: LinkedMarkdownInstance = {
      id: createLinkedMarkdownInstanceId(instances),
      targetPath: input.targetPath,
      scheduled: input.scheduled
    };

    if (input.label?.trim()) instance.label = input.label.trim();
    if (input.durationMinutes !== undefined) {
      instance.durationMinutes = input.durationMinutes;
    }

    await this.writeToBase(baseFile, [...instances, instance]);
    return instance;
  }

  resolveActiveBaseFile(): TFile | undefined {
    return resolveCurrentOnProgramBaseFile(this.app);
  }

  async readFromBase(baseFile: TFile): Promise<LinkedMarkdownInstance[]> {
    const source = await this.app.vault.cachedRead(baseFile);
    const parsed = parseYaml(source) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.views)) return [];

    for (const candidate of parsed.views) {
      if (!isRecord(candidate) || candidate.type !== CALENDAR_VIEW_TYPE) continue;
      return parseLinkedMarkdownInstances(candidate[LINKED_INSTANCES_KEY]).instances;
    }

    return [];
  }

  private async writeToBase(
    baseFile: TFile,
    instances: LinkedMarkdownInstance[]
  ): Promise<void> {
    const serialized = serializeLinkedMarkdownInstances(instances);
    const yamlValue = JSON.stringify(serialized);

    await this.app.vault.process(baseFile, (source) =>
      patchCalendarViewProperty(source, LINKED_INSTANCES_KEY, yamlValue)
    );
  }
}

function patchCalendarViewProperty(
  source: string,
  key: string,
  yamlValue: string
): string {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const hadTrailingNewline = source.endsWith("\n");
  const lines = source.split(/\r?\n/);

  let calendarStart = -1;
  let calendarIndent = "";

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)-\s*type:\s*["']?onprogram-calendar["']?\s*$/.exec(
      lines[index] ?? ""
    );
    if (!match) continue;
    calendarStart = index;
    calendarIndent = match[1] ?? "";
    break;
  }

  if (calendarStart < 0) {
    throw new Error(
      "The active OnProgram Base does not contain an OnProgram Calendar view."
    );
  }

  let calendarEnd = lines.length;
  const nextViewPattern = new RegExp(
    "^" + escapeRegExp(calendarIndent) + "-\\s*type:"
  );
  for (let index = calendarStart + 1; index < lines.length; index += 1) {
    if (nextViewPattern.test(lines[index] ?? "")) {
      calendarEnd = index;
      break;
    }
  }

  const propertyIndent = calendarIndent + "  ";
  const propertyPattern = new RegExp(
    "^" + escapeRegExp(propertyIndent) + escapeRegExp(key) + ":\\s*"
  );

  for (let index = calendarStart + 1; index < calendarEnd; index += 1) {
    if (!propertyPattern.test(lines[index] ?? "")) continue;
    lines[index] = propertyIndent + key + ": " + yamlValue;
    return finalize(lines, newline, hadTrailingNewline);
  }

  let insertAt = calendarEnd;
  for (let index = calendarStart + 1; index < calendarEnd; index += 1) {
    if (/^\s*order:\s*$/.test(lines[index] ?? "")) {
      insertAt = index;
      break;
    }
  }

  lines.splice(insertAt, 0, propertyIndent + key + ": " + yamlValue);
  return finalize(lines, newline, hadTrailingNewline);
}

function finalize(lines: string[], newline: string, trailing: boolean): string {
  let result = lines.join(newline);
  if (trailing && !result.endsWith(newline)) result += newline;
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}
