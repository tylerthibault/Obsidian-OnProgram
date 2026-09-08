import {
  DEFAULT_WORK_ITEM_PROPERTY_MAP,
  type WorkItemPropertyMap
} from "../models/work-item/WorkItemProperties";

export interface OnProgramSettings {
  debugMode: boolean;
  showStartupNotice: boolean;
  /** Internal mapping from canonical OnProgram fields to vault YAML property names. */
  workItemProperties: WorkItemPropertyMap;
}

export const DEFAULT_SETTINGS: OnProgramSettings = {
  debugMode: false,
  showStartupNotice: true,
  workItemProperties: { ...DEFAULT_WORK_ITEM_PROPERTY_MAP }
};
