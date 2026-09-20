import type { Plugin } from "obsidian";
import { ONPROGRAM_VIEW_POLISH_STYLES } from "./OnProgramViewPolishStyles";

const POLISH_STYLE_ID = "onprogram-view-polish";

/**
 * Installs the shared visual language used by OnProgram's primary Bases views.
 *
 * The individual views remain responsible for layout and interaction. This layer
 * deliberately focuses on presentation so Board, Calendar, Timeline, Projects,
 * and the generic Bases surface feel like parts of the same command center.
 */
export function installOnProgramViewPolish(plugin: Plugin): void {
  const doc = plugin.app.workspace.containerEl.ownerDocument;
  doc.getElementById(POLISH_STYLE_ID)?.remove();

  const style = doc.createElement("style");
  style.id = POLISH_STYLE_ID;
  style.textContent = ONPROGRAM_VIEW_POLISH_STYLES;
  doc.head.appendChild(style);
  plugin.register(() => style.remove());
}

