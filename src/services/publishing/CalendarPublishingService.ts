import { Menu, Notice, TFile, type Plugin } from "obsidian";
import {
  PUBLISHING_PLATFORMS,
  PUBLISHING_STATES,
  getPublishingPropertyKeys,
  hasPublishingStateValue,
  normalizePublishingState,
  publishingStateLabel,
  publishingStateSymbol,
  type PublishingPlatformDefinition,
  type PublishingState
} from "../../models/publishing/PublishingPlatform";
import type { OnProgramService } from "../ServiceRegistry";

const TRAY_CLASS = "onprogram-calendar-publishing-tray";
const PILL_CLASS = "onprogram-calendar-publishing-pill";

export class CalendarPublishingService implements OnProgramService {
  readonly id = "calendar-publishing";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    this.container.addEventListener("contextmenu", this.handleContextMenu);

    const doc = this.container.ownerDocument;
    const win = doc.defaultView;

    this.styleEl = doc.createElement("style");
    this.styleEl.dataset.onprogramPublishingStyles = "true";
    this.styleEl.textContent = PUBLISHING_STYLES;
    doc.head.appendChild(this.styleEl);

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
    if (this.container) {
      this.container.removeEventListener("contextmenu", this.handleContextMenu);
    }
    this.observer?.disconnect();
    this.observer = undefined;
    this.styleEl?.remove();
    this.styleEl = undefined;

    const win = this.container?.ownerDocument.defaultView;
    if (win && this.refreshFrame !== undefined) {
      win.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const card = target?.closest(
      ".onprogram-calendar-item[data-path]"
    ) as HTMLElement | null;
    const path = card?.dataset.path;
    if (!path) return;

    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) return;

    event.preventDefault();
    event.stopPropagation();

    const active: Array<{
      platform: PublishingPlatformDefinition;
      state: PublishingState | undefined;
    }> = [];
    const inactive: PublishingPlatformDefinition[] = [];

    for (const platform of PUBLISHING_PLATFORMS) {
      const keys = getPublishingPropertyKeys(platform);
      const rawState = frontmatter[keys.state];
      if (hasPublishingStateValue(rawState)) {
        active.push({ platform, state: normalizePublishingState(rawState) });
      } else {
        inactive.push(platform);
      }
    }

    const menu = new Menu();

    for (const entry of active) {
      this.addPlatformSubmenu(menu, path, entry.platform, entry.state);
    }

    if (active.length > 0 && inactive.length > 0) menu.addSeparator();

    for (const platform of inactive) {
      menu.addItem((item) => {
        item
          .setTitle(`Add ${platform.name}`)
          .setIcon("plus-circle")
          .onClick(() => void this.setPlatformState(path, platform, "planned"));
      });
    }

    menu.showAtMouseEvent(event);
  };

  private addPlatformSubmenu(
    menu: Menu,
    path: string,
    platform: PublishingPlatformDefinition,
    current: PublishingState | undefined
  ): void {
    menu.addItem((item) => {
      item
        .setTitle(
          `${platform.name} — ${current ? publishingStateLabel(current) : "Invalid state"}`
        )
        .setIcon(platformIcon(platform));

      // setSubmenu is available in supported Obsidian versions, but some
      // obsidian typings releases do not expose it on MenuItem.
      const submenu = (
        item as unknown as { setSubmenu(): Menu }
      ).setSubmenu();

      for (const state of PUBLISHING_STATES) {
        submenu.addItem((subItem) => {
          subItem
            .setTitle(publishingStateLabel(state))
            .setIcon(current === state ? "check" : stateIcon(state))
            .onClick(() => void this.setPlatformState(path, platform, state));
        });
      }

      submenu.addSeparator();
      submenu.addItem((subItem) => {
        subItem
          .setTitle(`Remove ${platform.name}`)
          .setIcon("trash-2")
          .onClick(() => void this.removePlatform(path, platform));
      });
    });
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

      // Platform scheduling uses the work item's canonical scheduled property.
      // Remove prototype per-platform schedule timestamps whenever this platform
      // is changed through the current GUI.
      delete frontmatter[keys.scheduled];

      if (state === "posted") {
        frontmatter[keys.posted] = localDateTimeIso(new Date());
      } else {
        delete frontmatter[keys.posted];
      }
    });

    new Notice(`OnProgram: ${platform.name} marked ${publishingStateLabel(state)}.`);
    this.queueRefresh();
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
    this.queueRefresh();
  }

  private queueRefresh(): void {
    const container = this.container;
    const win = container?.ownerDocument.defaultView;
    if (!container || !win || this.refreshFrame !== undefined) return;

    this.refreshFrame = win.requestAnimationFrame(() => {
      this.refreshFrame = undefined;
      this.refreshPublishingPills();
    });
  }

  private refreshPublishingPills(): void {
    const container = this.container;
    if (!container) return;

    const cards = Array.from(
      container.querySelectorAll(".onprogram-calendar-item[data-path]")
    ) as HTMLElement[];

    for (const card of cards) this.refreshCard(card);
  }

  private refreshCard(card: HTMLElement): void {
    const path = card.dataset.path;
    if (!path) return;
    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) return;

    const active: Array<{
      platform: PublishingPlatformDefinition;
      state: PublishingState | undefined;
    }> = [];

    for (const platform of PUBLISHING_PLATFORMS) {
      const keys = getPublishingPropertyKeys(platform);
      const rawState = frontmatter[keys.state];
      if (!hasPublishingStateValue(rawState)) continue;
      active.push({ platform, state: normalizePublishingState(rawState) });
    }

    let tray = card.querySelector(`:scope > .${TRAY_CLASS}`) as HTMLElement | null;

    if (active.length === 0) {
      tray?.remove();
      card.removeClass("onprogram-has-publishing");
      return;
    }

    if (!tray) tray = card.createDiv({ cls: TRAY_CLASS });
    tray.empty();

    for (const entry of active) {
      const pill = tray.createSpan({
        text: `${entry.platform.abbreviation} ${publishingStateSymbol(entry.state)}`,
        cls: PILL_CLASS
      });
      pill.dataset.platform = entry.platform.id;
      pill.dataset.state = entry.state ?? "invalid";
      const tooltip = buildTooltip(entry.platform, entry.state, frontmatter);
      pill.setAttr("aria-label", tooltip);
      pill.setAttr("title", tooltip);
    }

    card.addClass("onprogram-has-publishing");
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

function shouldRefreshForMutation(mutation: MutationRecord): boolean {
  const target = mutation.target as HTMLElement;
  return !target.closest?.(`.${TRAY_CLASS}`);
}

function buildTooltip(
  platform: PublishingPlatformDefinition,
  state: PublishingState | undefined,
  frontmatter: Record<string, unknown>
): string {
  const keys = getPublishingPropertyKeys(platform);
  const parts = [
    `${platform.name} — ${state ? publishingStateLabel(state) : "Invalid state"}`
  ];

  const posted = stringValue(frontmatter[keys.posted]);
  if (posted) parts.push(`Posted: ${formatDateTime(posted)}`);
  parts.push("Right-click this card to update publishing state");
  return parts.join("\n");
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function stateIcon(state: PublishingState): string {
  switch (state) {
    case "planned": return "circle";
    case "scheduled": return "calendar-clock";
    case "posted": return "check-circle-2";
    case "failed": return "circle-alert";
    case "skipped": return "minus-circle";
  }
}

function platformIcon(platform: PublishingPlatformDefinition): string {
  switch (platform.id) {
    case "youtube": return "youtube";
    case "instagram": return "instagram";
    default: return "send";
  }
}

function localDateTimeIso(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

const PUBLISHING_STYLES = `
.onprogram-calendar-publishing-tray {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  min-width: 0;
  z-index: 12;
  pointer-events: none;
}

.onprogram-calendar-timed-item > .onprogram-calendar-publishing-tray {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 3px;
  min-height: 18px;
  justify-content: flex-start;
  overflow: hidden;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-publishing-tray {
  margin-top: 4px;
  min-height: 18px;
  justify-content: flex-start;
}

.onprogram-calendar-publishing-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 34px;
  height: 18px;
  min-height: 18px;
  margin: 0;
  padding: 0 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 999px;
  color: var(--text-muted);
  background: var(--background-primary-alt);
  font-size: 10px;
  font-weight: var(--font-semibold);
  line-height: 16px;
  white-space: nowrap;
}

.onprogram-calendar-publishing-pill[data-state="planned"] {
  border-color: var(--text-faint);
  color: var(--text-muted);
}

.onprogram-calendar-publishing-pill[data-state="scheduled"] {
  border-color: var(--color-blue);
  color: var(--color-blue);
  background: color-mix(in srgb, var(--color-blue) 12%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="posted"] {
  border-color: var(--color-green);
  color: var(--color-green);
  background: color-mix(in srgb, var(--color-green) 12%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="failed"],
.onprogram-calendar-publishing-pill[data-state="invalid"] {
  border-color: var(--color-red);
  color: var(--color-red);
  background: color-mix(in srgb, var(--color-red) 10%, var(--background-primary));
}

.onprogram-calendar-publishing-pill[data-state="skipped"] {
  opacity: 0.62;
  border-color: var(--text-faint);
  color: var(--text-faint);
}

.onprogram-calendar-view .onprogram-calendar-timed-item:not(.onprogram-has-publishing) .onprogram-calendar-timed-title {
  bottom: 9px !important;
}

.onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
  bottom: 25px !important;
}

@container onprogram-calendar-card (max-width: 170px) {
  .onprogram-calendar-publishing-pill {
    min-width: 29px;
    height: 16px;
    min-height: 16px;
    padding: 0 4px;
    font-size: 9px;
    line-height: 14px;
  }

  .onprogram-calendar-view .onprogram-calendar-timed-item.onprogram-has-publishing .onprogram-calendar-timed-title {
    bottom: 23px !important;
  }
}
`;
