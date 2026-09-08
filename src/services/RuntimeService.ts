import type { OnProgramService } from "./ServiceRegistry";

export class RuntimeService implements OnProgramService {
  readonly id = "runtime";
  private startedAt: number | null = null;

  start(): void {
    this.startedAt = Date.now();
  }

  stop(): void {
    this.startedAt = null;
  }

  get isRunning(): boolean {
    return this.startedAt !== null;
  }

  get uptimeMs(): number {
    return this.startedAt === null ? 0 : Date.now() - this.startedAt;
  }
}
