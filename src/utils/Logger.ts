export type LogContext = Record<string, unknown>;

export class Logger {
  constructor(
    private readonly scope: string,
    private readonly isDebugEnabled: () => boolean
  ) {}

  debug(message: string, context?: LogContext): void {
    if (!this.isDebugEnabled()) {
      return;
    }

    console.debug(this.format(message), context ?? "");
  }

  info(message: string, context?: LogContext): void {
    console.info(this.format(message), context ?? "");
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.format(message), context ?? "");
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(this.format(message), error ?? "", context ?? "");
  }

  private format(message: string): string {
    return `[${this.scope}] ${message}`;
  }
}
