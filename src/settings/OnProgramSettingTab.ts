import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { OnProgramSettings, TaskFolderMode } from "./OnProgramSettings";

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
      .setName("Task folder mode")
      .setDesc("Choose whether tasks are stored beside the Base you are currently using or in one fixed vault folder.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("current-base", "Current Base folder / Tasks")
          .addOption("custom", "Custom vault folder")
          .setValue(this.host.settings.taskFolderMode)
          .onChange(async (value) => {
            this.host.settings.taskFolderMode = value as TaskFolderMode;
            await this.host.saveSettings();
            this.display();
          })
      );

    if (this.host.settings.taskFolderMode === "custom") {
      new Setting(containerEl)
        .setName("Custom task folder")
        .setDesc("Vault-relative folder for tasks created by OnProgram when Custom vault folder is selected. Leave empty to use the vault root.")
        .addText((text) =>
          text
            .setPlaceholder("OnProgram/Tasks")
            .setValue(this.host.settings.taskFolder)
            .onChange(async (value) => {
              this.host.settings.taskFolder = value.trim();
              await this.host.saveSettings();
            })
        );
    } else {
      new Setting(containerEl)
        .setName("Task destination")
        .setDesc("Tasks created from a Base are stored in a Tasks folder beside that Base, for example Project/Project Base.base → Project/Tasks/My Task.md.");
    }

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
      .setName("Open tasks side by side")
      .setDesc("When you double-click a task in Board, Calendar, or Timeline, open its Markdown file in a split pane to the right. Turn this off to open it in the current pane instead.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.openItemsInSplit).onChange(async (value) => {
          this.host.settings.openItemsInSplit = value;
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
