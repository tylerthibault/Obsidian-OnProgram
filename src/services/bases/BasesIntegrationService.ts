import type { Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";
import type { WorkItemParser } from "../work-items/WorkItemParser";
import { Logger } from "../../utils/Logger";
import {
  ONPROGRAM_BASES_VIEW_ID,
  OnProgramBasesView
} from "../../views/bases/OnProgramBasesView";
import { BasesWorkItemAdapter } from "./BasesWorkItemAdapter";

export class BasesIntegrationService implements OnProgramService {
  readonly id = "bases-integration";
  private registered = false;

  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger,
    private readonly parser: WorkItemParser
  ) {}

  start(): void {
    const adapter = new BasesWorkItemAdapter(this.plugin.app, this.parser);

    this.registered = this.plugin.registerBasesView(ONPROGRAM_BASES_VIEW_ID, {
      name: "OnProgram",
      icon: "compass",
      factory: (controller, containerEl) => new OnProgramBasesView(controller, containerEl, adapter)
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
