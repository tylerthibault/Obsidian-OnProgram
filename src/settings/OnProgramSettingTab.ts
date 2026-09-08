import { App, PluginSettingTab, Setting } from "obsidian";
import type { OnProgramSettings } from "./OnProgramSettings";

export interface OnProgramSettingsHost {
  settings: OnProgramSettings;
  saveSettings(): Promise<void>;
}

export class OnProgramSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly host: OnProgramSettingsHost) {
    super(app, host as never);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("onprogram-settings");

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Write verbose OnProgram diagnostic messages to the developer console.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.debugMode).onChange(async (value) => {
          this.host.settings.debugMode = value;
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show startup notice")
      .setDesc("Show a notice when OnProgram finishes loading.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.showStartupNotice).onChange(async (value) => {
          this.host.settings.showStartupNotice = value;
          await this.host.saveSettings();
        })
      );
  }
}
