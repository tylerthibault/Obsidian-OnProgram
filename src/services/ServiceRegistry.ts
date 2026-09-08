import { Logger } from "../utils/Logger";

export interface OnProgramService {
  readonly id: string;
  start(): void | Promise<void>;
  stop(): void;
}

export class ServiceRegistry {
  private readonly services = new Map<string, OnProgramService>();

  constructor(private readonly logger: Logger) {}

  register(service: OnProgramService): void {
    if (this.services.has(service.id)) {
      throw new Error(`Service already registered: ${service.id}`);
    }

    this.services.set(service.id, service);
    this.logger.debug("Service registered", { id: service.id });
  }

  get<T extends OnProgramService>(id: string): T {
    const service = this.services.get(id);
    if (!service) {
      throw new Error(`Service not registered: ${id}`);
    }

    return service as T;
  }

  async startAll(): Promise<void> {
    for (const service of this.services.values()) {
      this.logger.debug("Starting service", { id: service.id });
      await service.start();
    }
  }

  stopAll(): void {
    const services = Array.from(this.services.values()).reverse();

    for (const service of services) {
      this.logger.debug("Stopping service", { id: service.id });
      service.stop();
    }
  }
}
