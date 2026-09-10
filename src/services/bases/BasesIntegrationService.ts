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
import {
  ONPROGRAM_CALENDAR_VIEW_ID,
  OnProgramCalendarView
} from "../../views/bases/OnProgramCalendarView";
import {
  ONPROGRAM_TIMELINE_VIEW_ID,
  OnProgramTimelineView
} from "../../views/bases/OnProgramTimelineView";
import type { OnProgramService } from "../ServiceRegistry";
import type { TaskCreator } from "../work-items/TaskCreator";
import type { WorkItemOpener } from "../work-items/WorkItemOpener";
import type { WorkItemParser } from "../work-items/WorkItemParser";
import type { WorkItemWriter } from "../work-items/WorkItemWriter";
import { BasesWorkItemAdapter } from "./BasesWorkItemAdapter";

const CALENDAR_MODE_OPTIONS: Record<string, string> = {
  month: "Month",
  week: "Week",
  day: "Day"
};

const CALENDAR_FIELD_OPTIONS: Record<string, string> = {
  scheduled: "Scheduled",
  due: "Due",
  start: "Start"
};

const TIMELINE_ZOOM_OPTIONS: Record<string, string> = {
  "fifteen-minute": "15 min",
  hour: "Hour",
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter"
};

export class BasesIntegrationService implements OnProgramService {
  readonly id = "bases-integration";
  private registered = false;

  constructor(
    private readonly plugin: Plugin,
    private readonly logger: Logger,
    private readonly parser: WorkItemParser,
    private readonly writer: WorkItemWriter,
    private readonly taskCreator: TaskCreator,
    private readonly workItemOpener: WorkItemOpener,
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
      options: baseTaskFolderOptions,
      factory: (controller, containerEl) => new OnProgramBoardView(
        controller,
        containerEl,
        adapter,
        this.writer,
        this.taskCreator,
        this.workItemOpener,
        this.errorHandler
      )
    });

    const calendarRegistered = this.plugin.registerBasesView(ONPROGRAM_CALENDAR_VIEW_ID, {
      name: "OnProgram Calendar",
      icon: "calendar-days",
      options: calendarViewOptions,
      factory: (controller, containerEl) => new OnProgramCalendarView(
        controller,
        containerEl,
        adapter,
        this.writer,
        this.taskCreator,
        this.workItemOpener,
        this.errorHandler
      )
    });

    const timelineRegistered = this.plugin.registerBasesView(ONPROGRAM_TIMELINE_VIEW_ID, {
      name: "OnProgram Timeline",
      icon: "gantt-chart",
      options: timelineViewOptions,
      factory: (controller, containerEl) => new OnProgramTimelineView(
        controller,
        containerEl,
        adapter,
        this.writer,
        this.taskCreator,
        this.workItemOpener,
        this.errorHandler
      )
    });

    this.registered = inspectorRegistered && boardRegistered && calendarRegistered && timelineRegistered;

    if (this.registered) {
      this.logger.info("Native Bases views registered", {
        viewIds: [
          ONPROGRAM_BASES_VIEW_ID,
          ONPROGRAM_BOARD_VIEW_ID,
          ONPROGRAM_CALENDAR_VIEW_ID,
          ONPROGRAM_TIMELINE_VIEW_ID
        ]
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

/**
 * taskFolder is persisted in the view configuration so the view can route new
 * files, but it is intentionally hidden from the normal view-options UI. The
 * folder and the Base filter are one ownership contract and must not drift.
 */
function baseTaskFolderOptions() {
  return [
    {
      type: "folder" as const,
      key: "taskFolder",
      displayName: "OnProgram task folder",
      shouldHide: () => true
    }
  ];
}

function calendarViewOptions() {
  return [
    ...baseTaskFolderOptions(),
    {
      type: "dropdown" as const,
      key: "calendarMode",
      displayName: "Default calendar view",
      default: "month",
      options: CALENDAR_MODE_OPTIONS
    },
    {
      type: "dropdown" as const,
      key: "calendarField",
      displayName: "Calendar date field",
      default: "scheduled",
      options: CALENDAR_FIELD_OPTIONS
    }
  ];
}

function timelineViewOptions() {
  return [
    ...baseTaskFolderOptions(),
    {
      type: "dropdown" as const,
      key: "timelineZoom",
      displayName: "Default timeline zoom",
      default: "week",
      options: TIMELINE_ZOOM_OPTIONS
    }
  ];
}
