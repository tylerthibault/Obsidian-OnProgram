import type { Plugin } from "obsidian";
import type { ErrorHandler } from "../../core/ErrorHandler";
import { Logger } from "../../utils/Logger";
import {
  ONPROGRAM_BASES_VIEW_ID,
  OnProgramBasesView
} from "../../views/bases/OnProgramBasesView";
import {
  ONPROGRAM_BOARD_VIEW_ID,
  OnProgramBoardView
} from "../../views/bases/OnProgramBoardView";
import type { OnProgramService } from "../ServiceRegistry";
import type { WorkItemParser } from "../work-items/WorkItemParser";
import type { WorkItemWriter } from "../work-items/WorkItemWriter";
import { BasesWorkItemAdapter } from "./BasesWorkItemAdapter";

export class BasesIntegrationService implements OnProgramService {
  readonly id = "bases-integration";
  private registered = false;

  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger,
    private readonly parser: WorkItemParser,
    private readonly writer: WorkItemWriter,
    private readonly errorHandler: ErrorHandler
  ) {}

  start(): void {
    const adapter = new BasesWorkItemAdapter(this.plugin.app, this.parser);

    const inspectorRegistered = this.plugin.registerBasesView(ONPROGRAM_BASES_VIEW_ID, {
      name: "OnProgram Inspector",
      icon: "compass",
      factory: (controller, containerEl) => new OnProgramBasesView(controller, containerEl, adapter)
    });

    const boardRegistered = this.plugin.registerBasesView(ONPROGRAM_BOARD_VIEW_ID, {
      name: "OnProgram Board",
      icon: "columns-3",
      factory: (controller, containerEl) => new OnProgramBoardView(
        controller,
        containerEl,
        adapter,
        this.writer,
        this.errorHandler
      )
    });

    this.registered = inspectorRegistered && boardRegistered;

    if (this.registered) {
      this.logger.info("Native Bases views registered", {
        viewIds: [ONPROGRAM_BASES_VIEW_ID, ONPROGRAM_BOARD_VIEW_ID]
      });
    } else {
      this.logger.warn("Some Bases integrations were unavailable; verify the Bases core plugin is enabled");
    }
  }

  stop(): void {
    this.registered = false;
  }

  get isRegistered(): boolean {
    return this.registered;
  }
}
