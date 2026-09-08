import type { Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";
import { Logger } from "../../utils/Logger";
import {
  ONPROGRAM_BASES_VIEW_ID,
  OnProgramBasesView
} from "../../views/bases/OnProgramBasesView";

export class BasesIntegrationService implements OnProgramService {
  readonly id = "bases-integration";
  private registered = false;

  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger
  ) {}

  start(): void {
    this.registered = this.plugin.registerBasesView(ONPROGRAM_BASES_VIEW_ID, {
      name: "OnProgram",
      icon: "compass",
      factory: (controller, containerEl) => new OnProgramBasesView(controller, containerEl)
    });

    if (this.registered) {
      this.logger.info("Native Bases view registered", { viewId: ONPROGRAM_BASES_VIEW_ID });
    } else {
      this.logger.warn("Bases integration unavailable because Bases are not enabled");
    }
  }

  stop(): void {
    // Plugin.registerBasesView registrations are owned by the plugin lifecycle and
    // are automatically removed when Obsidian unloads the plugin.
    this.registered = false;
  }

  get isRegistered(): boolean {
    return this.registered;
  }
}
