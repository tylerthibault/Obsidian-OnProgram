import { TFile, TFolder, type App } from "obsidian";
import { OnProgramError } from "../../core/ErrorHandler";
import {
  validateWorkItemPropertyMap,
  type WorkItemPropertyMap
} from "../../models/work-item/WorkItemProperties";
import { onProgramBasePath, onProgramTasksFolder } from "./OnProgramBasePaths";

export interface OnProgramBaseCreationResult {
  baseFile: TFile;
  basePath: string;
  filesFolder: string;
  created: boolean;
}

/**
 * Creates the canonical OnProgram structure inside a user-selected folder.
 *
 * <folder>/
 *   <folder-name>.onprogram.base
 *   Tasks/
 *
 * The generated Base is permanently scoped to the local Tasks/ directory and
 * ships with Board, Calendar, and Timeline views already configured.
 */
export class OnProgramBaseCreator {
  constructor(
    private readonly app: App,
    private readonly getPropertyMap: () => WorkItemPropertyMap
  ) {}

  getBasePath(folder: TFolder): string {
    return onProgramBasePath(folder);
  }

  getFilesFolder(folder: TFolder): string {
    return onProgramTasksFolder(folder);
  }

  findBase(folder: TFolder): TFile | undefined {
    const existing = this.app.vault.getAbstractFileByPath(this.getBasePath(folder));
    return existing instanceof TFile ? existing : undefined;
  }

  async createInFolder(folder: TFolder): Promise<OnProgramBaseCreationResult> {
    const propertyMap = this.getPropertyMap();
    this.assertSafePropertyMap(propertyMap);

    const filesFolder = this.getFilesFolder(folder);
    await this.ensureFolder(filesFolder);

    const basePath = this.getBasePath(folder);
    const existing = this.app.vault.getAbstractFileByPath(basePath);

    if (existing) {
      if (!(existing instanceof TFile)) {
        throw new OnProgramError(
          `Cannot create OnProgram Base because '${basePath}' is not a file.`,
          "onprogram-base-path-conflict"
        );
      }

      await this.app.workspace.getLeaf(false).openFile(existing);
      return { baseFile: existing, basePath, filesFolder, created: false };
    }

    const content = buildOnProgramBaseConfig(filesFolder, propertyMap);
    const baseFile = await this.app.vault.create(basePath, content);
    await this.app.workspace.getLeaf(false).openFile(baseFile);

    return { baseFile, basePath, filesFolder, created: true };
  }

  private assertSafePropertyMap(propertyMap: WorkItemPropertyMap): void {
    const issues = validateWorkItemPropertyMap(propertyMap);
    if (issues.length === 0) return;

    throw new OnProgramError(
      `Cannot create an OnProgram Base with the current property mapping: ${issues.map((issue) => issue.message).join(" ")}`,
      "invalid-work-item-property-map"
    );
  }

  private async ensureFolder(path: string): Promise<void> {
    const segments = path.split("/").filter(Boolean);
    let current = "";

    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      const existing = this.app.vault.getAbstractFileByPath(current);

      if (!existing) {
        await this.app.vault.createFolder(current);
        continue;
      }

      if (!(existing instanceof TFolder)) {
        throw new OnProgramError(
          `Cannot create OnProgram Tasks directory because '${current}' is a file.`,
          "onprogram-files-folder-conflict"
        );
      }
    }
  }
}

export function buildOnProgramBaseConfig(
  filesFolder: string,
  propertyMap: WorkItemPropertyMap
): string {
  const propertyDisplayNames: Array<[keyof WorkItemPropertyMap, string]> = [
    ["type", "Type"],
    ["status", "Status"],
    ["project", "Project"],
    ["priority", "Priority"],
    ["start", "Start"],
    ["end", "End"],
    ["due", "Due"],
    ["scheduled", "Scheduled"],
    ["duration", "Duration"],
    ["completed", "Completed"],
    ["parent", "Parent"],
    ["dependsOn", "Depends on"]
  ];

  const visibleOrder = [
    "file.name",
    `note.${propertyMap.status}`,
    `note.${propertyMap.priority}`,
    `note.${propertyMap.project}`,
    `note.${propertyMap.scheduled}`,
    `note.${propertyMap.due}`,
    `note.${propertyMap.start}`,
    `note.${propertyMap.end}`,
    `note.${propertyMap.duration}`
  ];

  const propertyLines = propertyDisplayNames.flatMap(([key, displayName]) => [
    `  ${yamlString(propertyMap[key])}:`,
    `    displayName: ${yamlString(displayName)}`
  ]);

  const viewLines = [
    ...baseView("onprogram-board", "Board", filesFolder, visibleOrder),
    ...baseView("onprogram-calendar", "Calendar", filesFolder, visibleOrder),
    ...baseView("onprogram-timeline", "Timeline", filesFolder, visibleOrder)
  ];

  const folderExpression = `file.inFolder(${JSON.stringify(filesFolder)})`;

  return [
    "filters:",
    "  and:",
    `    - ${yamlString(folderExpression)}`,
    `    - ${yamlString('file.ext == "md"')}`,
    "properties:",
    ...propertyLines,
    "views:",
    ...viewLines,
    ""
  ].join("\n");
}

function baseView(
  type: string,
  name: string,
  taskFolder: string,
  order: string[]
): string[] {
  return [
    `  - type: ${yamlString(type)}`,
    `    name: ${yamlString(name)}`,
    `    taskFolder: ${yamlString(taskFolder)}`,
    "    order:",
    ...order.map((property) => `      - ${yamlString(property)}`)
  ];
}

function yamlString(value: string): string {
  // JSON strings are valid YAML double-quoted scalars and handle quotes,
  // backslashes, Unicode, and unusual folder/property names safely.
  return JSON.stringify(value);
}
