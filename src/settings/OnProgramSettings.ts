import {
  DEFAULT_WORK_ITEM_PROPERTY_MAP,
  type WorkItemPropertyMap
} from "../models/work-item/WorkItemProperties";

export interface OnProgramSettings {
  debugMode: boolean;
  showStartupNotice: boolean;
  /** Open work items beside the active OnProgram view when double-clicked. */
  openItemsInSplit: boolean;
  /** Internal mapping from canonical OnProgram fields to vault YAML property names. */
  workItemProperties: WorkItemPropertyMap;
  /** Vault-relative folder used by the Create Task command. Empty means vault root. */
  taskFolder: string;
  /** Optional vault-relative Markdown file used as the initial body/frontmatter template. */
  taskTemplatePath: string;
  /** Optional default project reference assigned to newly created tasks. */
  defaultProject: string;
}

export const DEFAULT_SETTINGS: OnProgramSettings = {
  debugMode: false,
  showStartupNotice: true,
  openItemsInSplit: true,
  workItemProperties: { ...DEFAULT_WORK_ITEM_PROPERTY_MAP },
  taskFolder: "OnProgram/Tasks",
  taskTemplatePath: "",
  defaultProject: ""
};
