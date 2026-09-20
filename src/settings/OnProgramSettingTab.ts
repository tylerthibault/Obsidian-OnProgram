import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { createTaskTypeId } from "../models/work-item/TaskTypeDefinition";
import type {
  OnProgramSettings,
  TaskFolderMode,
  ViewsBadgeMetric
} from "./OnProgramSettings";

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

    containerEl.createEl("h2", { text: "Task types" });
    containerEl.createEl("p", {
      text: "Create reusable work classifications for tasks. Calendar filtering uses these values, while unregistered values already present in Markdown remain valid.",
      cls: "setting-item-description"
    });

    let newTaskTypeName = "";
    new Setting(containerEl)
      .setName("Add task type")
      .setDesc("The stored ID is generated once from the name and stays stable when you rename the label.")
      .addText((text) => text
        .setPlaceholder("Editing")
        .onChange((value) => { newTaskTypeName = value; }))
      .addButton((button) => button
        .setButtonText("Add")
        .setCta()
        .onClick(async () => {
          const label = newTaskTypeName.trim();
          if (!label) return;
          const id = createTaskTypeId(
            label,
            this.host.settings.taskTypes.map((definition) => definition.id)
          );
          this.host.settings.taskTypes.push({
            id,
            label,
            icon: "tag",
            color: "#888888"
          });
          await this.host.saveSettings();
          this.display();
        }));

    this.host.settings.taskTypes.forEach((definition, index) => {
      const taskTypeSetting = new Setting(containerEl)
        .setName(definition.label)
        .setDesc(`Stored as ${definition.id}`);

      taskTypeSetting.addText((text) => text
        .setPlaceholder("Label")
        .setValue(definition.label)
        .onChange(async (value) => {
          const trimmed = value.trim();
          if (!trimmed) return;
          definition.label = trimmed;
          await this.host.saveSettings();
        }));

      taskTypeSetting.addText((text) => text
        .setPlaceholder("Lucide icon")
        .setValue(definition.icon)
        .onChange(async (value) => {
          definition.icon = value.trim() || "tag";
          await this.host.saveSettings();
        }));

      taskTypeSetting.addColorPicker((picker) => picker
        .setValue(definition.color)
        .onChange(async (value) => {
          definition.color = value;
          await this.host.saveSettings();
        }));

      taskTypeSetting.addButton((button) => button
        .setButtonText("↑")
        .setDisabled(index === 0)
        .onClick(async () => {
          if (index === 0) return;
          const [moved] = this.host.settings.taskTypes.splice(index, 1);
          if (!moved) return;
          this.host.settings.taskTypes.splice(index - 1, 0, moved);
          await this.host.saveSettings();
          this.display();
        }));

      taskTypeSetting.addButton((button) => button
        .setButtonText("↓")
        .setDisabled(index === this.host.settings.taskTypes.length - 1)
        .onClick(async () => {
          if (index >= this.host.settings.taskTypes.length - 1) return;
          const [moved] = this.host.settings.taskTypes.splice(index, 1);
          if (!moved) return;
          this.host.settings.taskTypes.splice(index + 1, 0, moved);
          await this.host.saveSettings();
          this.display();
        }));

      taskTypeSetting.addButton((button) => button
        .setButtonText("Remove")
        .setWarning()
        .onClick(async () => {
          this.host.settings.taskTypes.splice(index, 1);
          await this.host.saveSettings();
          this.display();
        }));
    });

    new Setting(containerEl)
      .setName("Badge property")
      .setDesc("Optional frontmatter property to display as a pill on Calendar items and Board cards, for example grade, priority, category, or owner.")
      .addText((text) =>
        text
          .setPlaceholder("grade")
          .setValue(this.host.settings.badgeProperty)
          .onChange(async (value) => {
            this.host.settings.badgeProperty = value.trim();
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Badge color")
      .setDesc("Choose a color for the work item badge.")
      .addDropdown((dropdown) =>
        addBadgeColorOptions(dropdown)
          .setValue(this.host.settings.badgeColor)
          .onChange(async (value) => {
            this.host.settings.badgeColor = value;
            await this.host.saveSettings();
            this.display();
          })
      );

    if (this.host.settings.badgeColor === "custom") {
      new Setting(containerEl)
        .setName("Custom badge color")
        .setDesc("Any valid CSS color, for example #ffffff, #4caf50, or rgb(120, 90, 255).")
        .addText((text) =>
          text
            .setPlaceholder("#ffffff")
            .setValue(this.host.settings.badgeCustomColor)
            .onChange(async (value) => {
              this.host.settings.badgeCustomColor = value.trim();
              await this.host.saveSettings();
            })
        );
    }

    new Setting(containerEl)
      .setName("Views badge metric")
      .setDesc("Show one compact views metric pill. Hover it to see all available view windows. Uses views_24_hours, views_1_week, and views_1_month frontmatter properties.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("off", "Off")
          .addOption("24-hours", "24 hours")
          .addOption("1-week", "1 week")
          .addOption("1-month", "1 month")
          .setValue(this.host.settings.viewsBadgeMetric)
          .onChange(async (value) => {
            this.host.settings.viewsBadgeMetric = value as ViewsBadgeMetric;
            await this.host.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Views badge color")
      .setDesc("Choose a separate color for the views metric pill.")
      .addDropdown((dropdown) =>
        addBadgeColorOptions(dropdown)
          .setValue(this.host.settings.viewsBadgeColor)
          .onChange(async (value) => {
            this.host.settings.viewsBadgeColor = value;
            await this.host.saveSettings();
            this.display();
          })
      );

    if (this.host.settings.viewsBadgeColor === "custom") {
      new Setting(containerEl)
        .setName("Custom views badge color")
        .setDesc("Any valid CSS color, for example #38bdf8 or rgb(56, 189, 248).")
        .addText((text) =>
          text
            .setPlaceholder("#38bdf8")
            .setValue(this.host.settings.viewsBadgeCustomColor)
            .onChange(async (value) => {
              this.host.settings.viewsBadgeCustomColor = value.trim();
              await this.host.saveSettings();
            })
        );
    }

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

function addBadgeColorOptions(dropdown: import("obsidian").DropdownComponent): import("obsidian").DropdownComponent {
  return dropdown
    .addOption("accent", "Accent")
    .addOption("green", "Green")
    .addOption("blue", "Blue")
    .addOption("purple", "Purple")
    .addOption("orange", "Orange")
    .addOption("red", "Red")
    .addOption("yellow", "Yellow")
    .addOption("gray", "Gray")
    .addOption("custom", "Custom");
}
