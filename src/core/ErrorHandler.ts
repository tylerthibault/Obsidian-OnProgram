import { Notice } from "obsidian";
import { Logger } from "../utils/Logger";

export class OnProgramError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "OnProgramError";
  }
}

export class ErrorHandler {
  constructor(private readonly logger: Logger) {}

  handle(error: unknown, context: string, userVisible = false): void {
    const normalized = this.normalize(error);

    this.logger.error(`Error during ${context}: ${normalized.message}`, normalized, {
      context,
      name: normalized.name
    });

    if (userVisible) {
      new Notice(`OnProgram: ${normalized.message}`);
    }
  }

  private normalize(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(typeof error === "string" ? error : "An unknown error occurred");
  }
}
