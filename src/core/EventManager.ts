import { Notice, TFolder, type Plugin } from "obsidian";
import type { OnProgramBaseCreator } from "../services/bases/OnProgramBaseCreator";
import { Logger } from "../utils/Logger";
import type { ErrorHandler } from "./ErrorHandler";

export class EventManager {
  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger,
    private readonly baseCreator: OnProgramBaseCreator,
    private readonly errorHandler: ErrorHandler
  ) {}

  registerCoreEvents(): void {
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        this.logger.debug("Workspace layout changed");
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFolder)) {
          return;
        }

        const existing = this.baseCreator.findBase(file);
        menu.addItem((item) => {
          item
            .setTitle(existing ? "Open OnProgram base" : "Create OnProgram base")
            .setIcon("database")
            .onClick(() => {
              void this.openOrCreateBase(file);
            });
        });
      })
    );

    this.logger.debug("Core events registered");
  }

  private async openOrCreateBase(folder: TFolder): Promise<void> {
    try {
      const result = await this.baseCreator.createInFolder(folder);
      this.logger.info(result.created ? "OnProgram Base created" : "OnProgram Base opened", {
        basePath: result.basePath,
        filesFolder: result.filesFolder
      });

      new Notice(
        result.created
          ? `OnProgram: Created ${result.basePath} and ${result.filesFolder}/.`
          : `OnProgram: Opened ${result.basePath}.`
      );
    } catch (error) {
      this.errorHandler.handle(error, "create OnProgram Base", true);
    }
  }
}
