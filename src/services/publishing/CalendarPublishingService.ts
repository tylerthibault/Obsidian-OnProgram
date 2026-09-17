import { Menu, Notice, TFile, type Plugin } from "obsidian";
import { PublishingPlatformPickerModal } from "../../components/PublishingPlatformPickerModal";
import { PublishingScheduleModal } from "../../components/PublishingScheduleModal";
import {
  PUBLISHING_PLATFORMS,
  PUBLISHING_STATES,
  getPublishingPlatform,
  getPublishingPropertyKeys,
  hasPublishingStateValue,
  normalizePublishingState,
  publishingStateLabel,
  publishingStateSymbol,
  type PublishingPlatformDefinition,
  type PublishingPlatformId,
  type PublishingState
} from "../../models/publishing/PublishingPlatform";
import type { OnProgramService } from "../ServiceRegistry";

const TRAY_CLASS = "onprogram-calendar-publishing-tray";
const PILL_CLASS = "onprogram-calendar-publishing-pill";
const ADD_CLASS = "onprogram-calendar-publishing-add";

export class CalendarPublishingService implements OnProgramService {
  readonly id = "calendar-publishing";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(private readonly plugin: Plugin) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    this.container.addEventListener("click", this.handleClick);

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
    if (this.container) this.container.removeEventListener("click", this.handleClick);
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

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const pill = target.closest(`.${PILL_CLASS}`) as HTMLElement | null;
    if (pill) {
      const card = pill.closest(".onprogram-calendar-item[data-path]") as HTMLElement | null;
      const path = card?.dataset.path;
      const platform = getPublishingPlatform(pill.dataset.platform);
      if (!path || !platform) return;

      event.preventDefault();
      event.stopPropagation();
      this.showPlatformMenu(event, path, platform);
      return;
    }

    const add = target.closest(`.${ADD_CLASS}`) as HTMLElement | null;
    if (!add) return;

    const card = add.closest(".onprogram-calendar-item[data-path]") as HTMLElement | null;
    const path = card?.dataset.path;
    if (!path) return;

    event.preventDefault();
    event.stopPropagation();
    this.openPlatformPicker(path);
  };

  private openPlatformPicker(path: string): void {
    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) return;

    const active = new Set<PublishingPlatformId>();
    for (const platform of PUBLISHING_PLATFORMS) {
      const keys = getPublishingPropertyKeys(platform);
      if (hasPublishingStateValue(frontmatter[keys.state])) active.add(platform.id);
    }

    new PublishingPlatformPickerModal(this.plugin.app, active, (platform) => {
      void this.setPlatformState(path, platform, "planned");
    }).open();
  }

  private showPlatformMenu(
    event: MouseEvent,
    path: string,
    platform: PublishingPlatformDefinition
  ): void {
    const frontmatter = this.getFrontmatter(path);
    if (!frontmatter) return;

    const keys = getPublishingPropertyKeys(platform);
    const current = normalizePublishingState(frontmatter[keys.state]);
    const scheduled = stringValue(frontmatter[keys.scheduled]);
    const menu = new Menu();

    for (const state of PUBLISHING_STATES) {
      if (state === "scheduled") {
        menu.addItem((item) => {
          item
            .setTitle(current === "scheduled" ? "Reschedule…" : "Schedule…")
            .setIcon(current === "scheduled" ? "check" : "calendar-clock")
            .onClick(() => this.openScheduleModal(path, platform, scheduled));
        });
        continue;
      }

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

  private openScheduleModal(
    path: string,
    platform: PublishingPlatformDefinition,
    initialValue: string | undefined
  ): void {
    new PublishingScheduleModal(
      this.plugin.app,
      platform,
      initialValue,
      (value) => void this.schedulePlatform(path, platform, value)
    ).open();
  }

  private async schedulePlatform(
    path: string,
    platform: PublishingPlatformDefinition,
    scheduled: string
  ): Promise<void> {
    const file = this.getFile(path);
    if (!file) return;
    const keys = getPublishingPropertyKeys(platform);

    await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter[keys.state] = "scheduled";
      frontmatter[keys.scheduled] = scheduled;
      delete frontmatter[keys.posted];
    });

    new Notice(`OnProgram: ${platform.name} scheduled for ${formatDateTime(scheduled)}.`);
    this.queueRefresh();
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

    let tray = card.querySelector(`:scope > .${TRAY_CLASS}`) as HTMLElement | null;
    if (!tray) tray = card.createDiv({ cls: TRAY_CLASS });
    tray.empty();

    let activeCount = 0;
    for (const platform of PUBLISHING_PLATFORMS) {
      const keys = getPublishingPropertyKeys(platform);
      const rawState = frontmatter[keys.state];
      if (!hasPublishingStateValue(rawState)) continue;

      activeCount += 1;
      const state = normalizePublishingState(rawState);
      const pill = tray.createEl("button", {
        text: `${platform.abbreviation} ${publishingStateSymbol(state)}`,
        cls: PILL_CLASS
      });
      pill.dataset.platform = platform.id;
      pill.dataset.state = state ?? "invalid";
      pill.setAttr("aria-label", buildTooltip(platform, state, frontmatter));
      pill.setAttr("title", buildTooltip(platform, state, frontmatter));
    }

    if (activeCount < PUBLISHING_PLATFORMS.length) {
      const add = tray.createEl("button", { text: "+", cls: ADD_CLASS });
      add.setAttr("aria-label", "Add publishing platform");
      add.setAttr("title", "Add publishing platform");
    }

    card.toggleClass("onprogram-has-publishing", activeCount > 0);
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

  const scheduled = stringValue(frontmatter[keys.scheduled]);
  const posted = stringValue(frontmatter[keys.posted]);
  if (scheduled) parts.push(`Scheduled: ${formatDateTime(scheduled)}`);
  if (posted) parts.push(`Posted: ${formatDateTime(posted)}`);
  parts.push("Click to update");
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
    case "posted": return "check-circle-2";
    case "failed": return "circle-alert";
    case "skipped": return "minus-circle";
    default: return "circle";
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
  gap: 4px;
  min-width: 0;
  z-index: 12;
}

.onprogram-calendar-timed-item > .onprogram-calendar-publishing-tray {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 2px;
  min-height: 28px;
  justify-content: flex-start;
  overflow: hidden;
  pointer-events: none;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item) > .onprogram-calendar-publishing-tray {
  margin-top: 4px;
  min-height: 28px;
  justify-content: flex-start;
}

.onprogram-calendar-publishing-pill,
.onprogram-calendar-publishing-add {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  border-radius: 999px;
  font-weight: var(--font-semibold);
  white-space: nowrap;
  pointer-events: auto;
}

.onprogram-calendar-publishing-pill {
  min-width: 34px;
  height: 18px;
  min-height: 18px;
  padding: 0 6px;
  border: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  background: var(--background-primary-alt);
  font-size: 10px;
  line-height: 16px;
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

/* Keep the plus visually compact, but give it a proper touch/click target. */
.onprogram-calendar-publishing-add {
  width: 30px;
  min-width: 30px;
  height: 28px;
  min-height: 28px;
  padding: 0;
  border: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  background: color-mix(in srgb, var(--background-primary-alt) 88%, transparent);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 100ms ease, border-color 100ms ease, background 100ms ease, color 100ms ease;
}

.onprogram-calendar-item:hover .onprogram-calendar-publishing-add,
.onprogram-calendar-publishing-add:hover,
.onprogram-calendar-publishing-add:focus-visible {
  opacity: 1;
  color: var(--text-accent);
  border-color: var(--interactive-accent);
  background: var(--background-modifier-hover);
}

/* Reserve enough room for the larger add-platform target at the bottom. */
.onprogram-calendar-timed-item:has(> .onprogram-calendar-publishing-tray) .onprogram-calendar-timed-title {
  bottom: 33px !important;
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

  /* Do not shrink the click target on narrow cards. */
  .onprogram-calendar-publishing-add {
    width: 28px;
    min-width: 28px;
    height: 26px;
    min-height: 26px;
    font-size: 17px;
  }

  .onprogram-calendar-timed-item:has(> .onprogram-calendar-publishing-tray) .onprogram-calendar-timed-title {
    bottom: 31px !important;
  }
}
`;
