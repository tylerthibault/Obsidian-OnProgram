import { TFile, type Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";

const CARD_SELECTOR = ".onprogram-calendar-item[data-path]";
const PROJECT_BADGE_CLASS = "onprogram-calendar-project-badge";
const SETTINGS_CHANGED_EVENT = "onprogram-settings-changed";

/**
 * Keeps project membership visible directly on Calendar cards.
 *
 * Publishing occupies the lower-left edge of timed cards, so project identity
 * uses the lower-right edge. The title remains centered and the top badge tray
 * stays available for grade/views/status metadata.
 */
export class CalendarProjectIndicatorService implements OnProgramService {
  readonly id = "calendar-project-indicator";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(
    private readonly plugin: Plugin,
    private readonly getProjectProperty: () => string
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const doc = this.container.ownerDocument;
    const win = doc.defaultView;

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramCalendarProjectStyles = "true";
    this.styleEl.textContent = PROJECT_INDICATOR_STYLES;
    doc.head.appendChild(this.styleEl);

    this.container.addEventListener(SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);

    if (win) {
      this.observer = new win.MutationObserver((mutations) => {
        if (mutations.some((mutation) => shouldRefreshForMutation(mutation))) {
          this.queueRefresh();
        }
      });
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on("changed", () => this.queueRefresh())
    );

    this.queueRefresh();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;

    if (this.container) {
      this.container.removeEventListener(SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);
    }

    this.styleEl?.remove();
    this.styleEl = undefined;

    const win = this.container?.ownerDocument.defaultView;
    if (win && this.refreshFrame !== undefined) {
      win.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private readonly handleSettingsChanged = (): void => {
    this.queueRefresh();
  };

  private queueRefresh(): void {
    const container = this.container;
    const win = container?.ownerDocument.defaultView;
    if (!container || !win || this.refreshFrame !== undefined) return;

    this.refreshFrame = win.requestAnimationFrame(() => {
      this.refreshFrame = undefined;
      this.refreshCards();
    });
  }

  private refreshCards(): void {
    const container = this.container;
    if (!container) return;

    const projectProperty = this.getProjectProperty().trim() || "project";
    const cards = Array.from(container.querySelectorAll(CARD_SELECTOR)) as HTMLElement[];

    for (const card of cards) {
      const path = card.dataset.path;
      if (!path) continue;

      const reference = this.getProjectReference(path, projectProperty);
      const projectName = reference ? displayProjectReference(reference) : undefined;
      let badge = card.querySelector(`:scope > .${PROJECT_BADGE_CLASS}`) as HTMLElement | null;

      if (!projectName) {
        badge?.remove();
        card.removeClass("onprogram-has-project");
        continue;
      }

      if (!badge) {
        badge = card.createSpan({ cls: PROJECT_BADGE_CLASS });
      }

      const label = `Project · ${projectName}`;
      if (badge.textContent !== label) badge.setText(label);
      badge.setAttr("title", `Project: ${projectName}`);
      badge.setAttr("aria-label", `Project: ${projectName}`);
      card.addClass("onprogram-has-project");
    }
  }

  private getProjectReference(path: string, property: string): string | undefined {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return undefined;

    const frontmatter = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    const raw = frontmatter?.[property];
    if (typeof raw !== "string") return undefined;

    const trimmed = raw.trim();
    return trimmed || undefined;
  }
}

function displayProjectReference(reference: string): string {
  let normalized = reference.trim();
  const wikiMatch = /^\[\[(.+)\]\]$/.exec(normalized);
  if (wikiMatch?.[1]) normalized = wikiMatch[1];

  const [pathPart, aliasPart] = normalized.split("|", 2);
  if (aliasPart?.trim()) return aliasPart.trim();

  const cleanPath = (pathPart ?? normalized)
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "");

  return cleanPath.split("/").pop()?.trim() || reference;
}

function shouldRefreshForMutation(mutation: MutationRecord): boolean {
  const target = mutation.target as HTMLElement;
  return !target.closest?.(`.${PROJECT_BADGE_CLASS}`);
}

const PROJECT_INDICATOR_STYLES = `
.onprogram-calendar-project-badge {
  z-index: 12;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  height: 18px;
  min-height: 18px;
  max-width: 44%;
  padding: 0 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  background: transparent !important;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: var(--font-semibold);
  line-height: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
  position: absolute;
  right: 7px;
  bottom: 3px;
}

/* Publishing and project identity share one bottom row. */
.onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
  right: 47% !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-project .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

/* Month/all-day/unscheduled chips can keep the project label in normal flow. */
.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-project-badge {
  position: static;
  margin-left: 4px;
  vertical-align: middle;
  max-width: min(220px, 48%);
}

@container onprogram-calendar-card (max-width: 210px) {
  .onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
    right: 4px;
    max-width: 42%;
    height: 16px;
    min-height: 16px;
    padding: 0 4px;
    font-size: 9px;
    line-height: 14px;
  }

  .onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
    right: 45% !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-project .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}

@container onprogram-calendar-card (max-width: 145px) {
  .onprogram-calendar-timed-item > .onprogram-calendar-project-badge {
    max-width: 46%;
    padding-left: 3px;
    padding-right: 3px;
    font-size: 8px;
  }

  .onprogram-calendar-timed-item.onprogram-has-project > .onprogram-calendar-publishing-tray {
    right: 49% !important;
  }
}
`;
