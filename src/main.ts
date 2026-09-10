import { Notice, Plugin } from "obsidian";
import { CommandRegistrar } from "./commands/CommandRegistrar";
import { ErrorHandler } from "./core/ErrorHandler";
import { EventManager } from "./core/EventManager";
import { LifecycleManager } from "./core/LifecycleManager";
import { RuntimeService } from "./services/RuntimeService";
import { ServiceRegistry } from "./services/ServiceRegistry";
import { BasesIntegrationService } from "./services/bases/BasesIntegrationService";
import { OnProgramBaseContext } from "./services/bases/OnProgramBaseContext";
import { OnProgramBaseCreator } from "./services/bases/OnProgramBaseCreator";
import { CalendarScrollStateService } from "./services/calendar/CalendarScrollStateService";
import { CalendarStatusService } from "./services/calendar/CalendarStatusService";
import { WorkItemBadgeService } from "./services/presentation/WorkItemBadgeService";
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
    await this.loadSettings();

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
    const taskCreator = new TaskCreator(this.app, () => ({
      taskFolderMode: this.settings.taskFolderMode,
      taskFolder: this.settings.taskFolder,
      taskTemplatePath: this.settings.taskTemplatePath,
      defaultProject: this.settings.defaultProject,
      propertyMap: this.settings.workItemProperties
    }));
    const baseContext = new OnProgramBaseContext(this.app);
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
      workItemOpener,
      errorHandler
    );
    const calendarStatus = new CalendarStatusService(
      this,
      workItemParser,
      workItemWriter,
      errorHandler
    );
    const calendarScrollState = new CalendarScrollStateService(this);
    const workItemBadges = new WorkItemBadgeService(this, () => ({
      badgeProperty: this.settings.badgeProperty,
      badgeColor: this.settings.badgeColor,
      badgeCustomColor: this.settings.badgeCustomColor
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
      services.register(workItemBadges);
      this.addSettingTab(new OnProgramSettingTab(this.app, this));

      new CommandRegistrar(this, logger, {
        lifecycle,
        runtime,
        errorHandler,
        taskCreator,
        baseContext,
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
      badgeCustomColor: this.settings.badgeCustomColor
    });
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
