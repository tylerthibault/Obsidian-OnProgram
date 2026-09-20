import { Notice, Plugin } from "obsidian";
import { CommandRegistrar } from "./commands/CommandRegistrar";
import { ErrorHandler } from "./core/ErrorHandler";
import { EventManager } from "./core/EventManager";
import { LifecycleManager } from "./core/LifecycleManager";
import { RuntimeService } from "./services/RuntimeService";
import { ServiceRegistry } from "./services/ServiceRegistry";
import { BasesIntegrationService } from "./services/bases/BasesIntegrationService";
import { OnProgramBaseContext } from "./services/bases/OnProgramBaseContext";
import { LinkedMarkdownInstanceStore } from "./services/bases/LinkedMarkdownInstanceStore";
import { OnProgramBaseCreator } from "./services/bases/OnProgramBaseCreator";
import { CalendarDayCountService } from "./services/calendar/CalendarDayCountService";
import { CalendarScrollStateService } from "./services/calendar/CalendarScrollStateService";
import { CalendarStatusService } from "./services/calendar/CalendarStatusService";
import { WorkItemBadgeService } from "./services/presentation/WorkItemBadgeService";
import { CalendarProjectIndicatorService } from "./services/projects/CalendarProjectIndicatorService";
import { MilestoneCreator } from "./services/projects/MilestoneCreator";
import { ProjectAssignmentService } from "./services/projects/ProjectAssignmentService";
import { ProjectCreator } from "./services/projects/ProjectCreator";
import { CalendarPublishingService } from "./services/publishing/CalendarPublishingService";
import { TaskCreator } from "./services/work-items/TaskCreator";
import { WorkItemEditorService } from "./services/work-items/WorkItemEditorService";
import { WorkItemOpener } from "./services/work-items/WorkItemOpener";
import { WorkItemParser } from "./services/work-items/WorkItemParser";
import { WorkItemScanner } from "./services/work-items/WorkItemScanner";
import { WorkItemWriter } from "./services/work-items/WorkItemWriter";
import {
  DEFAULT_SETTINGS,
  type OnProgramSettings
} from "./settings/OnProgramSettings";
import { OnProgramSettingTab } from "./settings/OnProgramSettingTab";
import { Logger } from "./utils/Logger";
import { installOnProgramViewPolish } from "./views/presentation/OnProgramViewPolish";

export default class OnProgramPlugin extends Plugin {
  settings: OnProgramSettings = {
    ...DEFAULT_SETTINGS,
    workItemProperties: { ...DEFAULT_SETTINGS.workItemProperties }
  };

  private logger?: Logger;
  private errorHandler?: ErrorHandler;
  private lifecycle?: LifecycleManager;
  private services?: ServiceRegistry;

  async onload(): Promise<void> {
    this.warnIfDevelopmentFolderDoesNotMatchManifestId();
    await this.loadSettings();
    installOnProgramViewPolish(this);

    const logger = new Logger("OnProgram", () => this.settings.debugMode);
    const errorHandler = new ErrorHandler(logger);
    const lifecycle = new LifecycleManager(logger);
    const services = new ServiceRegistry(logger);
    const runtime = new RuntimeService();
    const workItemParser = new WorkItemParser(() => this.settings.workItemProperties);
    const workItemScanner = new WorkItemScanner(this.app, workItemParser);
    const workItemWriter = new WorkItemWriter(this.app, () => this.settings.workItemProperties);
    const workItemEditor = new WorkItemEditorService(this.app, workItemWriter);
    const workItemOpener = new WorkItemOpener(this.app, () => this.settings.openItemsInSplit);
    const creationConfig = () => ({
      taskFolderMode: this.settings.taskFolderMode,
      taskFolder: this.settings.taskFolder,
      taskTemplatePath: this.settings.taskTemplatePath,
      defaultProject: this.settings.defaultProject,
      propertyMap: this.settings.workItemProperties
    });
    const taskCreator = new TaskCreator(this.app, creationConfig);
    const projectCreator = new ProjectCreator(this.app, creationConfig);
    const milestoneCreator = new MilestoneCreator(this.app, creationConfig);
    const projectAssignment = new ProjectAssignmentService(
      this.app,
      workItemParser,
      workItemWriter,
      errorHandler
    );
    const baseContext = new OnProgramBaseContext(this.app);
    const linkedMarkdownStore = new LinkedMarkdownInstanceStore(this.app);
    const baseCreator = new OnProgramBaseCreator(
      this.app,
      () => this.settings.workItemProperties
    );
    const basesIntegration = new BasesIntegrationService(
      this,
      logger,
      workItemParser,
      workItemWriter,
      taskCreator,
      projectCreator,
      milestoneCreator,
      projectAssignment,
      workItemEditor,
      workItemOpener,
      linkedMarkdownStore,
      errorHandler
    );
    const calendarStatus = new CalendarStatusService(
      this,
      workItemParser,
      workItemWriter,
      errorHandler
    );
    const calendarScrollState = new CalendarScrollStateService(this);
    const calendarDayCounts = new CalendarDayCountService(this);
    const calendarPublishing = new CalendarPublishingService(this, projectAssignment);
    const calendarProjects = new CalendarProjectIndicatorService(
      this,
      () => this.settings.workItemProperties.project
    );
    const workItemBadges = new WorkItemBadgeService(this, () => ({
      badgeProperty: this.settings.badgeProperty,
      badgeColor: this.settings.badgeColor,
      badgeCustomColor: this.settings.badgeCustomColor,
      viewsBadgeMetric: this.settings.viewsBadgeMetric,
      viewsBadgeColor: this.settings.viewsBadgeColor,
      viewsBadgeCustomColor: this.settings.viewsBadgeCustomColor
    }));

    this.logger = logger;
    this.errorHandler = errorHandler;
    this.lifecycle = lifecycle;
    this.services = services;

    lifecycle.beginLoading();

    try {
      services.register(runtime);
      services.register(basesIntegration);
      services.register(calendarStatus);
      services.register(calendarScrollState);
      services.register(calendarDayCounts);
      services.register(calendarPublishing);
      services.register(calendarProjects);
      services.register(workItemBadges);
      this.addSettingTab(new OnProgramSettingTab(this.app, this));

      new CommandRegistrar(this, logger, {
        lifecycle,
        runtime,
        errorHandler,
        taskCreator,
        baseContext,
        linkedMarkdownStore,
        workItemEditor,
        workItemScanner,
        workItemWriter
      }).registerCoreCommands();

      new EventManager(this, logger, baseCreator, errorHandler).registerCoreEvents();
      await services.startAll();
      lifecycle.markReady();
      logger.info("Plugin loaded");

      if (this.settings.showStartupNotice) {
        new Notice("OnProgram loaded");
      }
    } catch (error) {
      lifecycle.markFailed();
      try {
        services.stopAll();
      } catch (rollbackError) {
        errorHandler.handle(rollbackError, "startup rollback");
      }
      errorHandler.handle(error, "plugin startup", true);
      throw error;
    }
  }

  onunload(): void {
    this.lifecycle?.beginUnloading();
    try {
      this.services?.stopAll();
      this.logger?.info("Plugin unloaded");
    } catch (error) {
      this.errorHandler?.handle(error, "plugin shutdown");
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);

    const container = this.app.workspace.containerEl;
    const view = container.ownerDocument.defaultView;
    if (view) {
      container.dispatchEvent(new view.CustomEvent("onprogram-settings-changed"));
    }

    this.logger?.debug("Settings saved", {
      debugMode: this.settings.debugMode,
      showStartupNotice: this.settings.showStartupNotice,
      openItemsInSplit: this.settings.openItemsInSplit,
      workItemProperties: this.settings.workItemProperties,
      taskFolderMode: this.settings.taskFolderMode,
      taskFolder: this.settings.taskFolder,
      taskTemplatePath: this.settings.taskTemplatePath,
      defaultProject: this.settings.defaultProject,
      badgeProperty: this.settings.badgeProperty,
      badgeColor: this.settings.badgeColor,
      badgeCustomColor: this.settings.badgeCustomColor,
      viewsBadgeMetric: this.settings.viewsBadgeMetric,
      viewsBadgeColor: this.settings.viewsBadgeColor,
      viewsBadgeCustomColor: this.settings.viewsBadgeCustomColor
    });
  }

  private warnIfDevelopmentFolderDoesNotMatchManifestId(): void {
    const manifestWithDir = this.manifest as typeof this.manifest & { dir?: string };
    const dir = manifestWithDir.dir?.replace(/\\/g, "/").replace(/\/$/, "");
    const folderName = dir?.split("/").pop();
    if (!folderName || folderName === this.manifest.id) return;

    new Notice(
      `OnProgram development install mismatch: plugin folder '${folderName}' must be renamed to '${this.manifest.id}'. Quit Obsidian, rename the folder, then reopen the app.`,
      12000
    );
  }

  private async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<OnProgramSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {}),
      workItemProperties: {
        ...DEFAULT_SETTINGS.workItemProperties,
        ...(saved?.workItemProperties ?? {})
      }
    };
  }
}
