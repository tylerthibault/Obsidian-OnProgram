import { Logger } from "../utils/Logger";

export type PluginLifecycleState =
  | "created"
  | "loading"
  | "ready"
  | "unloading"
  | "failed";

export class LifecycleManager {
  private state: PluginLifecycleState = "created";

  constructor(private readonly logger: Logger) {}

  get currentState(): PluginLifecycleState {
    return this.state;
  }

  beginLoading(): void {
    this.transitionTo("loading");
  }

  markReady(): void {
    this.transitionTo("ready");
  }

  beginUnloading(): void {
    this.transitionTo("unloading");
  }

  markFailed(): void {
    this.transitionTo("failed");
  }

  private transitionTo(next: PluginLifecycleState): void {
    const previous = this.state;
    this.state = next;
    this.logger.debug("Lifecycle transition", { previous, next });
  }
}
