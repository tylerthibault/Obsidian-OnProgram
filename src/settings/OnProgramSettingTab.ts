import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { OnProgramSettings } from "./OnProgramSettings";

export interface OnProgramSettingsHost {
  settings: OnProgramSettings;
  saveSettings(): Promise<void>;
}

export class OnProgramSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly host: Plugin & OnProgramSettingsHost
  ) {
    super(app, host);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("onprogram-settings");

    new Setting(containerEl)
      .setName("Task folder")
      .setDesc("Vault-relative folder for tasks created by OnProgram. Leave empty to use the vault root.")
      .addText((text) =>
        text
          .setPlaceholder("OnProgram/Tasks")
          .setValue(this.host.settings.taskFolder)
          .onChange(async (value) => {
            this.host.settings.taskFolder = value.trim();
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Task template")
      .setDesc("Optional vault-relative Markdown template path, for example Templates/Task.md.")
      .addText((text) =>
        text
          .setPlaceholder("Templates/Task.md")
          .setValue(this.host.settings.taskTemplatePath)
          .onChange(async (value) => {
            this.host.settings.taskTemplatePath = value.trim();
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default project")
      .setDesc("Optional project reference added to newly created tasks.")
      .addText((text) =>
        text
          .setPlaceholder("[[My Project]]")
          .setValue(this.host.settings.defaultProject)
          .onChange(async (value) => {
            this.host.settings.defaultProject = value.trim();
            await this.host.saveSettings();
          })
      );

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
