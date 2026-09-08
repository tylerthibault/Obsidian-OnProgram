import type { Plugin } from "obsidian";
import { Logger } from "../utils/Logger";

export class EventManager {
  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger
  ) {}

  registerCoreEvents(): void {
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        this.logger.debug("Workspace layout changed");
      })
    );

    this.logger.debug("Core events registered");
  }
}
