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

const CALENDAR_MODES = ["month", "week", "day"] as const;
const CALENDAR_FIELDS = ["scheduled", "due", "start"] as const;
const TIMELINE_ZOOMS = [
  "fifteen-minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter"
] as const;

type CalendarMode = (typeof CALENDAR_MODES)[number];
type CalendarField = (typeof CALENDAR_FIELDS)[number];
type TimelineZoom = (typeof TIMELINE_ZOOMS)[number];

type ViewConfigAccess = {
  get(key: string): unknown;
  set(key: string, value: unknown | null): void;
};

type CalendarStateShim = {
  config: ViewConfigAccess;
  mode: CalendarMode;
  field: CalendarField;
  render(): void;
};

type TimelineStateShim = {
  config: ViewConfigAccess;
  zoom: TimelineZoom;
  render(): void;
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
      factory: (controller, containerEl) => configureCalendarPersistence(
        new OnProgramCalendarView(
          controller,
          containerEl,
          adapter,
          this.writer,
          this.taskCreator,
          this.workItemOpener,
          this.errorHandler
        )
      )
    });

    const timelineRegistered = this.plugin.registerBasesView(ONPROGRAM_TIMELINE_VIEW_ID, {
      name: "OnProgram Timeline",
      icon: "gantt-chart",
      options: timelineViewOptions,
      factory: (controller, containerEl) => configureTimelinePersistence(
        new OnProgramTimelineView(
          controller,
          containerEl,
          adapter,
          this.writer,
          this.taskCreator,
          this.workItemOpener,
          this.errorHandler
        )
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
      options: {
        month: "Month",
        week: "Week",
        day: "Day"
      }
    },
    {
      type: "dropdown" as const,
      key: "calendarField",
      displayName: "Calendar date field",
      default: "scheduled",
      options: {
        scheduled: "Scheduled",
        due: "Due",
        start: "Start"
      }
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
      options: {
        "fifteen-minute": "15 min",
        hour: "Hour",
        day: "Day",
        week: "Week",
        month: "Month",
        quarter: "Quarter"
      }
    }
  ];
}

/**
 * Bases stores these option values in the individual view configuration inside
 * the .base file. The current Calendar/Timeline classes keep their toolbar state
 * internally, so this small adapter synchronizes the two directions:
 *
 * - toolbar change -> persisted Base view option
 * - Configure view change -> live toolbar/view state
 *
 * Keeping this per-view means separate Bases can have different defaults.
 */
function configureCalendarPersistence(view: OnProgramCalendarView): OnProgramCalendarView {
  const state = view as unknown as CalendarStateShim;
  state.mode = readOption(state.config.get("calendarMode"), CALENDAR_MODES, "month");
  state.field = readOption(state.config.get("calendarField"), CALENDAR_FIELDS, "scheduled");

  let lastMode = state.mode;
  let lastField = state.field;
  const originalRender = state.render.bind(view);

  state.render = () => {
    const configuredMode = readOption(state.config.get("calendarMode"), CALENDAR_MODES, "month");
    const configuredField = readOption(
      state.config.get("calendarField"),
      CALENDAR_FIELDS,
      "scheduled"
    );

    if (state.mode !== lastMode && configuredMode === lastMode) {
      lastMode = state.mode;
      state.config.set("calendarMode", state.mode);
    } else if (configuredMode !== lastMode) {
      state.mode = configuredMode;
      lastMode = configuredMode;
    }

    if (state.field !== lastField && configuredField === lastField) {
      lastField = state.field;
      state.config.set("calendarField", state.field);
    } else if (configuredField !== lastField) {
      state.field = configuredField;
      lastField = configuredField;
    }

    originalRender();
  };

  return view;
}

function configureTimelinePersistence(view: OnProgramTimelineView): OnProgramTimelineView {
  const state = view as unknown as TimelineStateShim;
  state.zoom = readOption(state.config.get("timelineZoom"), TIMELINE_ZOOMS, "week");

  let lastZoom = state.zoom;
  const originalRender = state.render.bind(view);

  state.render = () => {
    const configuredZoom = readOption(state.config.get("timelineZoom"), TIMELINE_ZOOMS, "week");

    if (state.zoom !== lastZoom && configuredZoom === lastZoom) {
      lastZoom = state.zoom;
      state.config.set("timelineZoom", state.zoom);
    } else if (configuredZoom !== lastZoom) {
      state.zoom = configuredZoom;
      lastZoom = configuredZoom;
    }

    originalRender();
  };

  return view;
}

function readOption<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (typeof value !== "string") return fallback;
  return (allowed as readonly string[]).includes(value) ? value as T : fallback;
}
