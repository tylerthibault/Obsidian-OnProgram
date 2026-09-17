import { Modal, Setting, type App } from "obsidian";
import type {
  PublishingPlatformDefinition,
  PublishingPlatformId
} from "../models/publishing/PublishingPlatform";
import { PUBLISHING_PLATFORMS } from "../models/publishing/PublishingPlatform";

export class PublishingPlatformPickerModal extends Modal {
  constructor(
    app: App,
    private readonly activePlatforms: ReadonlySet<PublishingPlatformId>,
    private readonly onChoose: (platform: PublishingPlatformDefinition) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "Add publishing platform" });
    this.contentEl.createEl("p", {
      text: "Choose a platform to activate for this content item. It will start in Planned state."
    });

    const available = PUBLISHING_PLATFORMS.filter(
      (platform) => !this.activePlatforms.has(platform.id)
    );

    if (available.length === 0) {
      this.contentEl.createDiv({ text: "All configured publishing platforms are already active." });
      return;
    }

    for (const platform of available) {
      new Setting(this.contentEl)
        .setName(platform.name)
        .setDesc(`${platform.abbreviation} Calendar pill`)
        .addButton((button) => button
          .setButtonText("Add")
          .onClick(() => {
            this.onChoose(platform);
            this.close();
          }));
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
