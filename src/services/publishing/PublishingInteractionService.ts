import { Menu, Notice, TFile, type Plugin } from "obsidian";
import {
  PUBLISHING_STATES,
  getPublishingPlatform,
  getPublishingPropertyKeys,
  normalizePublishingState,
  publishingStateLabel,
  type PublishingPlatformDefinition,
  type PublishingState
} from "../../models/publishing/PublishingPlatform";
import type { OnProgramService } from "../ServiceRegistry";

const PUBLISHING_TRAY_SELECTOR = ".onprogram-calendar-publishing-tray";
const PUBLISHING_PILL_SELECTOR = ".onprogram-calendar-publishing-pill";
const PUBLISHING_CONTROL_SELECTOR = [
  PUBLISHING_PILL_SELECTOR,
  ".onprogram-calendar-publishing-add"
].join(", ");

/**
 * Keeps publishing controls interactive inside draggable Calendar cards and
 * owns the lightweight platform-state menu.
 *
 * The Calendar item's canonical `scheduled` property is the single source of
 * truth for date/time. Platform publishing fields only describe distribution
 * state (planned/scheduled/posted/etc.); they do not maintain a second schedule.
 */
export class PublishingInteractionService implements OnProgramService {
  readonly id = "publishing-interactions";

  private container?: HTMLElement;
  private styleEl?: HTMLStyleElement;
  private pointerStartedOnPublishingControl = false;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const doc = this.container.ownerDocument;

    this.container.addEventListener("pointerdown", this.handlePointerDown, true);
    this.container.addEventListener("pointerup", this.handlePointerEnd, true);
    this.container.addEventListener("pointercancel", this.handlePointerEnd, true);
    this.container.addEventListener("dragstart", this.handleDragStart, true);
    // Capture platform-pill clicks before CalendarPublishingService's legacy
    // bubble listener so Scheduled can be a one-click state change.
    this.container.addEventListener("click", this.handlePublishingClick, true);

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramPublishingInteractionStyles = "true";
    this.styleEl.textContent = INTERACTION_STYLES;
    doc.head.appendChild(this.styleEl);
  }

  stop(): void {
    if (this.container) {
      this.container.removeEventListener("pointerdown", this.handlePointerDown, true);
      this.container.removeEventListener("pointerup", this.handlePointerEnd, true);
      this.container.removeEventListener("pointercancel", this.handlePointerEnd, true);
      this.container.removeEventListener("dragstart", this.handleDragStart, true);
      this.container.removeEventListener("click", this.handlePublishingClick, true);
    }

    this.styleEl?.remove();
    this.styleEl = undefined;
    this.pointerStartedOnPublishingControl = false;
    this.container = undefined;
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    const target = event.target as HTMLElement | null;
    this.pointerStartedOnPublishingControl = Boolean(
      target?.closest(PUBLISHING_CONTROL_SELECTOR)
    );
  };

  private readonly handlePointerEnd = (): void => {
    // Keep the flag alive through the pointerup/click turn, then clear it.
    const win = this.container?.ownerDocument.defaultView;
    if (!win) {
      this.pointerStartedOnPublishingControl = false;
      return;
    }

    win.setTimeout(() => {
      this.pointerStartedOnPublishingControl = false;
    }, 0);
  };

  private readonly handleDragStart = (event: DragEvent): void => {
    if (!this.pointerStartedOnPublishingControl) return;

    event.preventDefault();
    event.stopPropagation();
    this.pointerStartedOnPublishingControl = false;
  };

  private readonly handlePublishingClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const pill = target?.closest(PUBLISHING_PILL_SELECTOR) as HTMLElement | null;
    if (!pill) return;

    const card = pill.closest(".onprogram-calendar-item[data-path]") as HTMLElement | null;
    const path = card?.dataset.path;
    const platform = getPublishingPlatform(pill.dataset.platform);
    if (!path || !platform) return;

    // Prevent the older publishing listener from opening the date/time modal.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.showPlatformMenu(event, path, platform);
  };

  private showPlatformMenu(
    event: MouseEvent,
    path: string,
    platform: PublishingPlatformDefinition
  ): void {
    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) return;

    const keys = getPublishingPropertyKeys(platform);
    const current = normalizePublishingState(frontmatter[keys.state]);
    const menu = new Menu();

    for (const state of PUBLISHING_STATES) {
      menu.addItem((item) => {
        item
          .setTitle(`Mark ${publishingStateLabel(state).toLowerCase()}`)
          .setIcon(current === state ? "check" : stateIcon(state))
          .onClick(() => void this.setPlatformState(path, platform, state));
      });
    }

    menu.addSeparator();
    menu.addItem((item) => {
      item
        .setTitle(`Remove ${platform.name}`)
        .setIcon("trash-2")
        .onClick(() => void this.removePlatform(path, platform));
    });

    menu.showAtMouseEvent(event);
  }

  private async setPlatformState(
    path: string,
    platform: PublishingPlatformDefinition,
    state: PublishingState
  ): Promise<void> {
    const file = this.getFile(path);
    if (!file) return;
    const keys = getPublishingPropertyKeys(platform);

    await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[keys.state] = state;

      // Platform-specific schedule timestamps were part of the first prototype.
      // The Calendar item's `scheduled` value already owns the date/time, so
      // clean the redundant legacy field whenever the platform is changed.
      delete frontmatter[keys.scheduled];

      if (state === "posted") {
        frontmatter[keys.posted] = localDateTimeIso(new Date());
      } else {
        delete frontmatter[keys.posted];
      }
    });

    new Notice(`OnProgram: ${platform.name} marked ${publishingStateLabel(state)}.`);
  }

  private async removePlatform(
    path: string,
    platform: PublishingPlatformDefinition
  ): Promise<void> {
    const file = this.getFile(path);
    if (!file) return;
    const keys = getPublishingPropertyKeys(platform);

    await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
      delete frontmatter[keys.state];
      delete frontmatter[keys.scheduled];
      delete frontmatter[keys.posted];
    });

    new Notice(`OnProgram: removed ${platform.name} from this content item.`);
  }

  private getFile(path: string): TFile | undefined {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : undefined;
  }

  private getFrontmatter(path: string): Record<string, unknown> | undefined {
    const file = this.getFile(path);
    if (!file) return undefined;
    return this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
  }
}

function stateIcon(state: PublishingState): string {
  switch (state) {
    case "planned": return "circle";
    case "scheduled": return "calendar-check";
    case "posted": return "check-circle-2";
    case "failed": return "circle-alert";
    case "skipped": return "minus-circle";
  }
}

function localDateTimeIso(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const INTERACTION_STYLES = `
/* The platform tray should not consume a third of a one-hour event just so the
   add control can be clickable. Keep the visual row compact and allow the add
   control's hit box to extend slightly beyond it. */
.onprogram-calendar-timed-item > ${PUBLISHING_TRAY_SELECTOR} {
  bottom: 3px !important;
  min-height: 18px !important;
  overflow: visible !important;
  gap: 3px !important;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > ${PUBLISHING_TRAY_SELECTOR} {
  min-height: 18px !important;
  gap: 3px !important;
}

/* Large hit target, small visual affordance. The button itself is 30x26, while
   ::before draws the compact 18px + circle that the user actually sees. */
.onprogram-calendar-publishing-add {
  position: relative !important;
  width: 30px !important;
  min-width: 30px !important;
  height: 26px !important;
  min-height: 26px !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  font-size: 0 !important;
  line-height: 1 !important;
  opacity: 0.55 !important;
  cursor: pointer !important;
  overflow: visible !important;
}

.onprogram-calendar-publishing-add::before {
  content: "+";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  background: var(--background-primary-alt);
  color: var(--text-muted);
  font-size: 16px;
  font-weight: var(--font-semibold);
  line-height: 1;
  transition: border-color 100ms ease, background 100ms ease, color 100ms ease;
}

.onprogram-calendar-item:hover .onprogram-calendar-publishing-add,
.onprogram-calendar-publishing-add:hover,
.onprogram-calendar-publishing-add:focus-visible {
  opacity: 1 !important;
}

.onprogram-calendar-publishing-add:hover::before,
.onprogram-calendar-publishing-add:focus-visible::before {
  color: var(--text-accent);
  border-color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

/* Merely having the add-platform control must not steal title space. Reserve a
   bottom status row only after at least one platform is actually active. */
.onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
  bottom: 9px !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

@container onprogram-calendar-card (max-width: 170px) {
  .onprogram-calendar-publishing-add {
    width: 28px !important;
    min-width: 28px !important;
    height: 24px !important;
    min-height: 24px !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
    bottom: 9px !important;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}
`;
