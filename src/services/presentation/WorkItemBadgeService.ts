import type { HoverParent, HoverPopover, Plugin } from "obsidian";
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
  viewsBadgeMetric: "off" | "24-hours" | "1-week" | "1-month";
  viewsBadgeColor: string;
  viewsBadgeCustomColor: string;
}

interface ViewsMetricDefinition {
  property: string;
  label: string;
}

const VIEWS_METRICS: Record<Exclude<BadgeSettings["viewsBadgeMetric"], "off">, ViewsMetricDefinition> = {
  "24-hours": { property: "views_24_hours", label: "24h" },
  "1-week": { property: "views_1_week", label: "1 week" },
  "1-month": { property: "views_1_month", label: "1 month" }
};

const BADGE_SELECTOR = [
  ".onprogram-calendar-item[data-path]",
  ".onprogram-board-card[data-path]"
].join(", ");

const SETTINGS_CHANGED_EVENT = "onprogram-settings-changed";
const CALENDAR_BADGE_TRAY_CLASS = "onprogram-calendar-badge-tray";

export class WorkItemBadgeService implements OnProgramService, HoverParent {
  readonly id = "work-item-badges";
  hoverPopover: HoverPopover | null = null;

  private container?: HTMLElement;
  private observer?: MutationObserver;
  private refreshFrame?: number;
  private styleEl?: HTMLStyleElement;

  constructor(
    private readonly plugin: Plugin,
    private readonly getSettings: () => BadgeSettings
  ) {}

  start(): void {
    this.container = this.plugin.app.workspace.containerEl;
    const view = this.container.ownerDocument.defaultView;

    this.styleEl = this.container.ownerDocument.createElement("style");
    this.styleEl.dataset.onprogramBadgeStyles = "true";
    this.styleEl.textContent = BADGE_STYLES;
    this.container.ownerDocument.head.appendChild(this.styleEl);

    this.container.addEventListener(SETTINGS_CHANGED_EVENT, this.handleSettingsChanged);
    this.container.addEventListener("mouseover", this.handleCalendarTitleHover);

    if (view) {
      this.observer = new view.MutationObserver(() => this.queueRefresh());
      this.observer.observe(this.container, { childList: true, subtree: true });
    }

    // Editing frontmatter does not necessarily rebuild the Calendar immediately.
    // Refresh the badge as soon as Obsidian's metadata cache sees the new value.
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
      this.container.removeEventListener("mouseover", this.handleCalendarTitleHover);
    }

    this.styleEl?.remove();
    this.styleEl = undefined;

    const view = this.container?.ownerDocument.defaultView;
    if (view && this.refreshFrame !== undefined) {
      view.cancelAnimationFrame(this.refreshFrame);
    }

    this.refreshFrame = undefined;
    this.container = undefined;
  }

  private readonly handleSettingsChanged = (): void => {
    this.queueRefresh();
  };

  private readonly handleCalendarTitleHover = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const titleEl = target?.closest(
      ".onprogram-calendar-item-title"
    ) as HTMLElement | null;
    if (!titleEl) return;

    const calendarItem = titleEl.closest(
      ".onprogram-calendar-item[data-path]"
    ) as HTMLElement | null;
    const path = calendarItem?.dataset.path;
    if (!path) return;

    // Use native Page Preview primarily when the title has actually been truncated.
    if (titleEl.scrollWidth <= titleEl.clientWidth) return;

    this.plugin.app.workspace.trigger("hover-link", {
      event,
      source: "onprogram-calendar",
      hoverParent: this,
      targetEl: titleEl,
      linktext: path
    });
  };

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
    // Grade is the useful development default. Users can point this at any
    // other frontmatter property (priority, category, owner, etc.).
    const property = settings.badgeProperty.trim() || "grade";
    const color = normalizeBadgeColor(settings.badgeColor);
    const viewsColor = normalizeBadgeColor(settings.viewsBadgeColor);

    for (const rawElement of Array.from(container.querySelectorAll(BADGE_SELECTOR))) {
      const element = rawElement as HTMLElement;
      const path = element.dataset.path;
      if (!path) continue;

      const isCalendarItem = element.classList.contains("onprogram-calendar-item");
      const tray = isCalendarItem ? getOrCreateCalendarBadgeTray(element) : undefined;
      const parent = tray ?? element;

      const value = getFileBadgeValue(this.plugin.app, path, property);
      const primaryBadge = getOrCreateBadge(parent, "onprogram-primary-badge", Boolean(value));

      if (value && primaryBadge) {
        if (primaryBadge.textContent !== value) primaryBadge.setText(value);
        primaryBadge.removeAttribute("title");
        primaryBadge.removeAttribute("aria-label");
        applyBadgeAppearance(primaryBadge, {
          property,
          color,
          customColor: settings.badgeCustomColor
        });
      }

      const viewsMetric = settings.viewsBadgeMetric;
      const selectedViews = viewsMetric === "off"
        ? undefined
        : VIEWS_METRICS[viewsMetric];
      const selectedViewsValue = selectedViews
        ? getFileBadgeValue(this.plugin.app, path, selectedViews.property)
        : undefined;
      const viewsBadge = getOrCreateBadge(parent, "onprogram-views-badge", Boolean(selectedViewsValue));

      if (selectedViews && selectedViewsValue && viewsBadge) {
        const compact = formatCompactMetric(selectedViewsValue);
        if (viewsBadge.textContent !== compact) viewsBadge.setText(compact);

        const breakdown = buildViewsBreakdown(path, this.plugin, selectedViews);
        const tooltip = breakdown || `Views ${selectedViews.label}: ${selectedViewsValue}`;
        viewsBadge.setAttr("title", tooltip);
        viewsBadge.setAttr("aria-label", tooltip);
        viewsBadge.dataset.metric = viewsMetric;

        applyBadgeAppearance(viewsBadge, {
          property: selectedViews.property,
          color: viewsColor,
          customColor: settings.viewsBadgeCustomColor
        });
      }

      cleanupCalendarBadgeTray(element);

      const hasAnyBadge = Boolean(value || selectedViewsValue);
      element.toggleClass("onprogram-has-work-item-badge", hasAnyBadge);
    }
  }
}

function getOrCreateBadge(
  parent: HTMLElement,
  specificClass: string,
  shouldExist: boolean
): HTMLElement | undefined {
  let badge = parent.querySelector(
    `:scope > .${specificClass}`
  ) as HTMLElement | null;

  if (!shouldExist) {
    badge?.remove();
    return undefined;
  }

  if (!badge) {
    badge = parent.createSpan({
      cls: `onprogram-work-item-badge ${specificClass}`
    });
  }

  return badge;
}

function getOrCreateCalendarBadgeTray(element: HTMLElement): HTMLElement {
  const existing = element.querySelector(
    `:scope > .${CALENDAR_BADGE_TRAY_CLASS}`
  ) as HTMLElement | null;
  return existing ?? element.createDiv({ cls: CALENDAR_BADGE_TRAY_CLASS });
}

function cleanupCalendarBadgeTray(element: HTMLElement): void {
  const tray = element.querySelector(
    `:scope > .${CALENDAR_BADGE_TRAY_CLASS}`
  ) as HTMLElement | null;
  if (tray && tray.children.length === 0) tray.remove();
}

function buildViewsBreakdown(
  path: string,
  plugin: Plugin,
  selected: ViewsMetricDefinition
): string {
  const parts: string[] = [];

  for (const definition of Object.values(VIEWS_METRICS)) {
    const value = getFileBadgeValue(plugin.app, path, definition.property);
    if (!value) continue;
    parts.push(`${definition.label}: ${formatFullMetric(value)}`);
  }

  if (parts.length === 0) {
    const selectedValue = getFileBadgeValue(plugin.app, path, selected.property);
    return selectedValue ? `Views ${selected.label}: ${selectedValue}` : "";
  }

  return `Views — ${parts.join(" • ")}`;
}

function formatCompactMetric(value: string): string {
  const numeric = parseMetricNumber(value);
  if (numeric === undefined) return value;

  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(numeric);
}

function formatFullMetric(value: string): string {
  const numeric = parseMetricNumber(value);
  if (numeric === undefined) return value;
  return new Intl.NumberFormat().format(numeric);
}

function parseMetricNumber(value: string): number | undefined {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

const BADGE_STYLES = `
.onprogram-calendar-item,
.onprogram-board-card {
  position: relative;
}

/* Timed cards are their own responsive containers, so badge layout can react
   to the actual card width instead of the overall Obsidian pane width. */
.onprogram-calendar-view .onprogram-calendar-timed-item {
  container-type: inline-size;
  container-name: onprogram-calendar-card;
}

.onprogram-work-item-badge {
  --onprogram-badge-color: var(--interactive-accent);
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 9;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 30px;
  height: 22px;
  min-height: 22px;
  max-height: 22px;
  max-width: 42%;
  box-sizing: border-box;
  padding: 1px 8px;
  border: 1px solid var(--onprogram-badge-color);
  border-radius: 999px;
  background: color-mix(in srgb, var(--onprogram-badge-color) 18%, var(--background-primary));
  color: var(--text-normal);
  font-size: var(--font-ui-smaller);
  font-weight: var(--font-semibold);
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}

.onprogram-work-item-badge[data-badge-color="green"] { --onprogram-badge-color: var(--color-green); }
.onprogram-work-item-badge[data-badge-color="blue"] { --onprogram-badge-color: var(--color-blue); }
.onprogram-work-item-badge[data-badge-color="purple"] { --onprogram-badge-color: var(--color-purple); }
.onprogram-work-item-badge[data-badge-color="orange"] { --onprogram-badge-color: var(--color-orange); }
.onprogram-work-item-badge[data-badge-color="red"] { --onprogram-badge-color: var(--color-red); }
.onprogram-work-item-badge[data-badge-color="yellow"] { --onprogram-badge-color: var(--color-yellow); }
.onprogram-work-item-badge[data-badge-color="gray"] { --onprogram-badge-color: var(--text-muted); }

.onprogram-views-badge {
  min-width: 34px;
  pointer-events: auto;
  cursor: help;
}

/* Calendar status + property + views badges share one horizontal floating row. */
.onprogram-calendar-badge-tray {
  position: absolute;
  top: -8px;
  right: -7px;
  z-index: 14;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  max-width: calc(100% - 8px);
  pointer-events: none;
}

.onprogram-calendar-badge-tray > .onprogram-work-item-badge,
.onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
  position: static !important;
  inset: auto !important;
  flex: 0 0 auto;
  margin: 0;
}

.onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
  order: 1;
}

.onprogram-calendar-badge-tray > .onprogram-primary-badge {
  order: 2;
}

.onprogram-calendar-badge-tray > .onprogram-views-badge {
  order: 3;
  pointer-events: auto;
}

/* Board cards do not have a shared tray yet, so offset a second badge inward. */
.onprogram-board-card > .onprogram-primary-badge {
  right: 6px;
}

.onprogram-board-card > .onprogram-views-badge {
  right: 54px;
}

/* Keep timed titles on one clean line; native Page Preview handles overflow detail. */
.onprogram-calendar-view .onprogram-calendar-timed-item .onprogram-calendar-timed-title {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 22px;
  bottom: 9px;
  width: auto;
  max-width: none;
  min-width: 0;
  height: auto;
  margin: 0;
  padding: 0 6px;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.3;
}

.onprogram-calendar-item:not(.onprogram-calendar-timed-item).onprogram-has-work-item-badge .onprogram-calendar-item-title {
  padding-right: 44px;
}

.onprogram-board-card.onprogram-has-work-item-badge .onprogram-board-card-title {
  padding-right: 104px;
}

/* Compact timed cards: keep badges inside the card. The posted/done state is
   already communicated by the card treatment, so the full status pill is
   hidden when horizontal room is scarce. */
@container onprogram-calendar-card (max-width: 210px) {
  .onprogram-calendar-badge-tray {
    top: 4px;
    right: 4px;
    max-width: calc(100% - 8px);
    gap: 3px;
  }

  .onprogram-calendar-badge-tray > .onprogram-calendar-status-badge {
    display: none !important;
  }

  .onprogram-calendar-badge-tray > .onprogram-work-item-badge {
    min-width: 24px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
    max-width: 58px;
    padding: 0 5px;
    font-size: 10px;
    line-height: 16px;
  }

  .onprogram-calendar-badge-tray > .onprogram-views-badge {
    min-width: 28px;
  }

  .onprogram-calendar-item-time {
    max-width: calc(100% - 72px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .onprogram-calendar-timed-title {
    top: 24px !important;
    left: 5px !important;
    right: 5px !important;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }
}

@container onprogram-calendar-card (max-width: 145px) {
  .onprogram-calendar-badge-tray {
    gap: 2px;
    right: 3px;
  }

  .onprogram-calendar-badge-tray > .onprogram-work-item-badge {
    min-width: 22px;
    max-width: 48px;
    padding-left: 4px;
    padding-right: 4px;
    font-size: 9px;
  }

  .onprogram-calendar-item-time {
    font-size: 10px;
    max-width: calc(100% - 58px);
  }
}
`;
