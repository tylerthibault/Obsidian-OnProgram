import type { Plugin } from "obsidian";
import type { OnProgramService } from "../ServiceRegistry";
import {
  applyBadgeAppearance,
  getFileBadgeValue,
  normalizeBadgeColor
} from "../../views/presentation/WorkItemBadge";

interface BadgeSettings {
  badgeProperty: string;
  badgeColor: string;
  badgeCustomColor: string;
}

const BADGE_SELECTOR = [
  ".onprogram-calendar-item[data-path]",
  ".onprogram-board-card[data-path]"
].join(", ");

export class WorkItemBadgeService implements OnProgramService {
  readonly id = "work-item-badges";

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;

  constructor(
    private readonly plugin: Plugin,
    private readonly getSettings: () => BadgeSettings
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const view = this.container.ownerDocument.defaultView;

    if (view) {
      this.observer = new view.MutationObserver(() => this.queueRefresh());
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    this.queueRefresh();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;

    const view = this.container?.ownerDocument.defaultView;
    if (view && this.refreshFrame !== undefined) {
      view.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private queueRefresh(): void {
    const container = this.container;
    const view = container?.ownerDocument.defaultView;
    if (!container || !view || this.refreshFrame !== undefined) return;

    this.refreshFrame = view.requestAnimationFrame(() => {
      this.refreshFrame = undefined;
      this.refreshBadges();
    });
  }

  private refreshBadges(): void {
    const container = this.container;
    if (!container) return;

    const settings = this.getSettings();
    const property = settings.badgeProperty.trim();
    const color = normalizeBadgeColor(settings.badgeColor);

    for (const rawElement of Array.from(container.querySelectorAll(BADGE_SELECTOR))) {
      const element = rawElement as HTMLElement;
      const path = element.dataset.path;
      if (!path) continue;

      const existing = element.querySelector(".onprogram-work-item-badge") as HTMLElement | null;
      const value = property
        ? getFileBadgeValue(this.plugin.app, path, property)
        : undefined;

      if (!value) {
        existing?.remove();
        element.removeClass("onprogram-has-work-item-badge");
        continue;
      }

      const badge = existing ?? element.createSpan({ cls: "onprogram-work-item-badge" });
      if (badge.textContent !== value) badge.setText(value);

      applyBadgeAppearance(badge, {
        property,
        color,
        customColor: settings.badgeCustomColor
      });
      element.addClass("onprogram-has-work-item-badge");
    }
  }
}
