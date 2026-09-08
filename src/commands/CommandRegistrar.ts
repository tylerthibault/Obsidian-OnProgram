import { Notice, Plugin } from "obsidian";
import type { LifecycleManager } from "../core/LifecycleManager";
import type { RuntimeService } from "../services/RuntimeService";
import type { WorkItemScanner } from "../services/work-items/WorkItemScanner";
import { Logger } from "../utils/Logger";

export interface CommandDependencies {
  lifecycle: LifecycleManager;
  runtime: RuntimeService;
  workItemScanner: WorkItemScanner;
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

    this.plugin.addCommand({
      id: "onprogram-scan-work-items",
      name: "Scan work items",
      callback: () => {
        const result = this.dependencies.workItemScanner.scanVault();

        this.logger.info("Work item scan complete", {
          markdownFileCount: result.markdownFileCount,
          validCount: result.items.length,
          invalidCount: result.invalid.length,
          ignoredCount: result.ignored.length
        });

        if (result.invalid.length > 0) {
          this.logger.warn("Invalid work item candidates found", {
            files: result.invalid.map((entry) => ({
              path: entry.path,
              issues: entry.issues.map((issue) => issue.message)
            }))
          });
        }

        new Notice(
          `OnProgram scan: ${result.items.length} valid, ${result.invalid.length} invalid, ${result.ignored.length} ignored.`
        );
      }
    });

    this.logger.debug("Core commands registered");
  }
}
