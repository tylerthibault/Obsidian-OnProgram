/*
OnProgram prebuilt development bundle.
Source lives under src/. Running `npm run build` regenerates main.js with esbuild.
*/
const { Notice, Plugin, PluginSettingTab, Setting } = require("obsidian");

class Logger {
  constructor(scope, isDebugEnabled) {
    this.scope = scope;
    this.isDebugEnabled = isDebugEnabled;
  }

  debug(message, context) {
    if (!this.isDebugEnabled()) return;
    console.debug(this.format(message), context ?? "");
  }

  info(message, context) {
    console.info(this.format(message), context ?? "");
  }

  warn(message, context) {
    console.warn(this.format(message), context ?? "");
  }

  error(message, error, context) {
    console.error(this.format(message), error ?? "", context ?? "");
  }

  format(message) {
    return `[${this.scope}] ${message}`;
  }
}

class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  handle(error, context, userVisible = false) {
    const normalized = error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "An unknown error occurred");

    this.logger.error(`Error during ${context}: ${normalized.message}`, normalized, {
      context,
      name: normalized.name
    });

    if (userVisible) {
      new Notice(`OnProgram: ${normalized.message}`);
    }
  }
}

class LifecycleManager {
  constructor(logger) {
    this.logger = logger;
    this.state = "created";
  }

  get currentState() {
    return this.state;
  }

  beginLoading() { this.transitionTo("loading"); }
  markReady() { this.transitionTo("ready"); }
  beginUnloading() { this.transitionTo("unloading"); }
  markFailed() { this.transitionTo("failed"); }

  transitionTo(next) {
    const previous = this.state;
    this.state = next;
    this.logger.debug("Lifecycle transition", { previous, next });
  }
}

class EventManager {
  constructor(plugin, logger) {
    this.plugin = plugin;
    this.logger = logger;
  }

  registerCoreEvents() {
    this.plugin.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        this.logger.debug("Workspace layout changed");
      })
    );

    this.logger.debug("Core events registered");
  }
}

class ServiceRegistry {
  constructor(logger) {
    this.logger = logger;
    this.services = new Map();
  }

  register(service) {
    if (this.services.has(service.id)) {
      throw new Error(`Service already registered: ${service.id}`);
    }

    this.services.set(service.id, service);
    this.logger.debug("Service registered", { id: service.id });
  }

  async startAll() {
    for (const service of this.services.values()) {
      this.logger.debug("Starting service", { id: service.id });
      await service.start();
    }
  }

  stopAll() {
    const services = Array.from(this.services.values()).reverse();
    for (const service of services) {
      this.logger.debug("Stopping service", { id: service.id });
      service.stop();
    }
  }
}

class RuntimeService {
  constructor() {
    this.id = "runtime";
    this.startedAt = null;
  }

  start() {
    this.startedAt = Date.now();
  }

  stop() {
    this.startedAt = null;
  }

  get isRunning() {
    return this.startedAt !== null;
  }

  get uptimeMs() {
    return this.startedAt === null ? 0 : Date.now() - this.startedAt;
  }
}

const DEFAULT_SETTINGS = {
  debugMode: false,
  showStartupNotice: true
};

class OnProgramSettingTab extends PluginSettingTab {
  constructor(app, host) {
    super(app, host);
    this.host = host;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("onprogram-settings");

    new Setting(containerEl)
      .setName("Debug mode")
      .setDesc("Write verbose OnProgram diagnostic messages to the developer console.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.debugMode).onChange(async (value) => {
          this.host.settings.debugMode = value;
          await this.host.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show startup notice")
      .setDesc("Show a notice when OnProgram finishes loading.")
      .addToggle((toggle) =>
        toggle.setValue(this.host.settings.showStartupNotice).onChange(async (value) => {
          this.host.settings.showStartupNotice = value;
          await this.host.saveSettings();
        })
      );
  }
}

class CommandRegistrar {
  constructor(plugin, logger, dependencies) {
    this.plugin = plugin;
    this.logger = logger;
    this.dependencies = dependencies;
  }

  registerCoreCommands() {
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

module.exports = class OnProgramPlugin extends Plugin {
  constructor(...args) {
    super(...args);
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async onload() {
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

      new CommandRegistrar(this, logger, { lifecycle, runtime }).registerCoreCommands();
      new EventManager(this, logger).registerCoreEvents();

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

  onunload() {
    this.lifecycle?.beginUnloading();

    try {
      this.services?.stopAll();
      this.logger?.info("Plugin unloaded");
    } catch (error) {
      this.errorHandler?.handle(error, "plugin shutdown");
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.logger?.debug("Settings saved", {
      debugMode: this.settings.debugMode,
      showStartupNotice: this.settings.showStartupNotice
    });
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(saved ?? {})
    };
  }
};
