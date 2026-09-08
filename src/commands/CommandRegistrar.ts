import { Notice, Plugin } from "obsidian";
import type { LifecycleManager } from "../core/LifecycleManager";
import type { RuntimeService } from "../services/RuntimeService";
import { Logger } from "../utils/Logger";

export interface CommandDependencies {
  lifecycle: LifecycleManager;
  runtime: RuntimeService;
}

export class CommandRegistrar {
  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger,
    private readonly dependencies: CommandDependencies
  ) {}

  registerCoreCommands(): void {
    this.plugin.addCommand({
      id: "onprogram-test",
      name: "Test OnProgram",
      callback: () => {
        this.logger.debug("Test command executed");
        new Notice("OnProgram is working!");
      }
    });

    this.plugin.addCommand({
      id: "onprogram-diagnostics",
      name: "Show diagnostics",
      callback: () => {
        const { lifecycle, runtime } = this.dependencies;
        const uptimeSeconds = Math.floor(runtime.uptimeMs / 1000);
        new Notice(
          `OnProgram: ${lifecycle.currentState}; runtime ${runtime.isRunning ? "running" : "stopped"}; uptime ${uptimeSeconds}s`
        );
      }
    });

    this.logger.debug("Core commands registered");
  }
}
