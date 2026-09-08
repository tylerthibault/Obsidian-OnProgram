export interface OnProgramSettings {
  debugMode: boolean;
  showStartupNotice: boolean;
}

export const DEFAULT_SETTINGS: OnProgramSettings = {
  debugMode: false,
  showStartupNotice: true
};
