import { Notice, Plugin } from "obsidian";
import { CommandRegistrar } from "./commands/CommandRegistrar";
import { ErrorHandler } from "./core/ErrorHandler";
import { EventManager } from "./core/EventManager";
import { LifecycleManager } from "./core/LifecycleManager";
import { RuntimeService } from "./services/RuntimeService";
import { ServiceRegistry } from "./services/ServiceRegistry";
import {
  DEFAULT_SETTINGS,
  type OnProgramSettings
} from "./settings/OnProgramSettings";
import { OnProgramSettingTab } from "./settings/OnProgramSettingTab";
import { Logger } from "./utils/Logger";

export default class OnProgramPlugin extends Plugin {
  settings: OnProgramSettings = { ...DEFAULT_SETTINGS };

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

    this.logger = logger;
    this.errorHandler = errorHandler;
    this.lifecycle = lifecycle;
    this.services = services;

    lifecycle.beginLoading();

    try {
      services.register(runtime);

      this.addSettingTab(new OnProgramSettingTab(this.app, this));

      new CommandRegistrar(this, logger, {
        lifecycle,
        runtime
      }).registerCoreCommands();

      new EventManager(this, logger).registerCoreEvents();

      await services.startAll();
      lifecycle.markReady();

      logger.info("Plugin loaded");

      if (this.settings.showStartupNotice) {
        new Notice("OnProgram loaded");
      }
    } catch (error) {
      lifecycle.markFailed();
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
    this.logger?.debug("Settings saved", {
      debugMode: this.settings.debugMode,
      showStartupNotice: this.settings.showStartupNotice
    });
  }

  private async loadSettings(): Promise<void> {
    const saved = (await this.loadData()) as Partial<OnProgramSettings> | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {})
    };
  }
}
