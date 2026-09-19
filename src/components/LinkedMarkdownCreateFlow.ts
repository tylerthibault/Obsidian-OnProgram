import { Notice, type App, type TFile } from "obsidian";
import type { ErrorHandler } from "../core/ErrorHandler";
import type { LinkedMarkdownInstanceStore } from "../services/bases/LinkedMarkdownInstanceStore";
import { LinkedMarkdownInstanceModal } from "./LinkedMarkdownInstanceModal";

export interface LinkedMarkdownCreateFlowOptions {
  initialFile?: TFile;
  initialLabel?: string;
  initialScheduled?: string;
  initialDurationMinutes?: number;
}

export function openLinkedMarkdownCreateFlow(
  app: App,
  store: LinkedMarkdownInstanceStore,
  errorHandler: ErrorHandler,
  options: LinkedMarkdownCreateFlowOptions = {}
): void {
  new LinkedMarkdownInstanceModal(app, {
    heading: "Add linked Markdown instance",
    initialFile: options.initialFile,
    initialLabel: options.initialLabel,
    initialScheduled: options.initialScheduled,
    initialDurationMinutes: options.initialDurationMinutes,
    onSubmit: async (draft) => {
      await store.addToActiveBase({
        targetPath: draft.file.path,
        scheduled: draft.scheduled,
        label: draft.label,
        durationMinutes: draft.durationMinutes
      });

      new Notice(
        "OnProgram: linked " + draft.file.basename + " at " + draft.scheduled + "."
      );
    },
    onError: (error) => errorHandler.handle(
      error,
      "create linked Markdown instance",
      true
    )
  }).open();
}
