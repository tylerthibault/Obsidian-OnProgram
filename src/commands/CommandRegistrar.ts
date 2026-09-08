import { Notice, Plugin } from "obsidian";
import { CreateTaskModal } from "../components/CreateTaskModal";
import type { ErrorHandler } from "../core/ErrorHandler";
import type { LifecycleManager } from "../core/LifecycleManager";
import type { RuntimeService } from "../services/RuntimeService";
import type { TaskCreator } from "../services/work-items/TaskCreator";
import type { WorkItemScanner } from "../services/work-items/WorkItemScanner";
import type { WorkItemWriter } from "../services/work-items/WorkItemWriter";
import { Logger } from "../utils/Logger";

export interface CommandDependencies {
  lifecycle: LifecycleManager;
  runtime: RuntimeService;
  errorHandler: ErrorHandler;
  taskCreator: TaskCreator;
  workItemScanner: WorkItemScanner;
  workItemWriter: WorkItemWriter;
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
      id: "onprogram-create-task",
      name: "Create task",
      callback: () => {
        new CreateTaskModal(this.plugin.app, {
          onSubmit: async (title) => {
            const result = await this.dependencies.taskCreator.createTask({ title });

            this.logger.info("Task created", {
              path: result.path,
              usedTemplate: result.usedTemplate
            });

            new Notice(`OnProgram: Created ${result.title}.`);
          },
          onError: (error) => {
            this.dependencies.errorHandler.handle(error, "create task", true);
          }
        }).open();
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

    this.plugin.addCommand({
      id: "onprogram-writer-test-complete-active",
      name: "Writer test: complete active work item",
      callback: async () => {
        await this.runWriterTest("complete");
      }
    });

    this.plugin.addCommand({
      id: "onprogram-writer-test-reopen-active",
      name: "Writer test: reopen active work item",
      callback: async () => {
        await this.runWriterTest("reopen");
      }
    });

    this.logger.debug("Core commands registered");
  }

  private async runWriterTest(action: "complete" | "reopen"): Promise<void> {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("OnProgram: Open a Markdown work item before running the writer test.");
      return;
    }

    const parsed = this.dependencies.workItemScanner.scanFile(activeFile);
    if (parsed.kind !== "valid") {
      new Notice("OnProgram: The active file is not a valid work item.");
      return;
    }

    try {
      const result = action === "complete"
        ? await this.dependencies.workItemWriter.completeItem(parsed.item)
        : await this.dependencies.workItemWriter.reopenItem(parsed.item);

      this.logger.info(`Writer test ${action} complete`, {
        path: result.path,
        changedProperties: result.changedProperties,
        beforeMtime: result.beforeMtime,
        afterMtime: result.afterMtime
      });

      new Notice(
        `OnProgram writer: ${action === "complete" ? "completed" : "reopened"} ${parsed.item.title}.`
      );
    } catch (error) {
      this.dependencies.errorHandler.handle(error, `writer test ${action}`, true);
    }
  }
}
