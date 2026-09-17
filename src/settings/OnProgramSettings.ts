import {
  DEFAULT_WORK_ITEM_PROPERTY_MAP,
  type WorkItemPropertyMap
} from "../models/work-item/WorkItemProperties";

export type TaskFolderMode = "current-base" | "custom";
export type ViewsBadgeMetric = "off" | "24-hours" | "1-week" | "1-month";

export interface OnProgramSettings {
  debugMode: boolean;
  showStartupNotice: boolean;
  /** Open work items beside the active OnProgram view when double-clicked. */
  openItemsInSplit: boolean;
  /** Internal mapping from canonical OnProgram fields to vault YAML property names. */
  workItemProperties: WorkItemPropertyMap;
  /**
   * Where newly created tasks are stored. current-base uses a Tasks/ folder
   * beside the active Base; custom uses taskFolder below.
   */
  taskFolderMode: TaskFolderMode;
  /** Vault-relative folder used when taskFolderMode is custom. Empty means vault root. */
  taskFolder: string;
  /** Optional vault-relative Markdown file used as the initial body/frontmatter template. */
  taskTemplatePath: string;
  /** Optional default project reference assigned to newly created tasks. */
  defaultProject: string;
  /** Optional frontmatter property shown as a badge on supported OnProgram views. */
  badgeProperty: string;
  /** Badge palette name. Custom uses badgeCustomColor. */
  badgeColor: string;
  /** CSS color used when badgeColor is custom, for example #ffffff or rgb(...). */
  badgeCustomColor: string;
  /** Which views metric is shown as the compact analytics badge. */
  viewsBadgeMetric: ViewsBadgeMetric;
  /** Views badge palette name. Custom uses viewsBadgeCustomColor. */
  viewsBadgeColor: string;
  /** CSS color used when viewsBadgeColor is custom. */
  viewsBadgeCustomColor: string;
}

export const DEFAULT_SETTINGS: OnProgramSettings = {
  debugMode: false,
  showStartupNotice: true,
  openItemsInSplit: true,
  workItemProperties: { ...DEFAULT_WORK_ITEM_PROPERTY_MAP },
  taskFolderMode: "current-base",
  taskFolder: "OnProgram/Tasks",
  taskTemplatePath: "",
  defaultProject: "",
  badgeProperty: "",
  badgeColor: "accent",
  badgeCustomColor: "",
  viewsBadgeMetric: "24-hours",
  viewsBadgeColor: "blue",
  viewsBadgeCustomColor: ""
};
