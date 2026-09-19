import type { QueryController } from "obsidian";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
import type { LinkedMarkdownInstanceStore } from "../../services/bases/LinkedMarkdownInstanceStore";
import type { ProjectAssignmentService } from "../../services/projects/ProjectAssignmentService";
import type { TaskCreator } from "../../services/work-items/TaskCreator";
import type { WorkItemOpener } from "../../services/work-items/WorkItemOpener";
import { OnProgramDashboardView } from "./OnProgramDashboardView";

type DashboardWidth = "centered" | "full";
type DashboardSpan = "half" | "full";
type DashboardSectionId =
  | "summary"
  | "attention"
  | "upcoming"
  | "board"
  | "calendar"
  | "projects"
  | "publishing";

interface DashboardSectionLayout {
  id: DashboardSectionId;
  visible: boolean;
  span: DashboardSpan;
}

interface DashboardSectionDefinition {
  id: DashboardSectionId;
  label: string;
  description: string;
  defaultSpan: DashboardSpan;
  fixedSpan?: DashboardSpan;
}

const DASHBOARD_LAYOUT_VERSION = "2";

const DASHBOARD_SECTIONS: readonly DashboardSectionDefinition[] = [
  {
    id: "summary",
    label: "Summary cards",
    description: "Due today, in progress, scheduled, publishing, and projects",
    defaultSpan: "full",
    fixedSpan: "full"
  },
  {
    id: "attention",
    label: "Needs attention",
    description: "Blocked, waiting, and overdue work",
    defaultSpan: "half"
  },
  {
    id: "upcoming",
    label: "Up next",
    description: "The next dated pieces of open work",
    defaultSpan: "half"
  },
  {
    id: "board",
    label: "Board",
    description: "Compact task status columns",
    defaultSpan: "full"
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Today and the next six days",
    defaultSpan: "full"
  },
  {
    id: "projects",
    label: "Projects",
    description: "Active project progress",
    defaultSpan: "half"
  },
  {
    id: "publishing",
    label: "Publishing",
    description: "Platform distribution state",
    defaultSpan: "half"
  }
];

const SECTION_SYMBOLS: Readonly<Record<Exclude<DashboardSectionId, "summary">, string>> = {
  attention: "!",
  upcoming: "↗",
  board: "▦",
  calendar: "▤",
  projects: "◆",
  publishing: "➤"
};

/**
 * Adds per-Base presentation controls to the core Dashboard without coupling
 * dashboard data rendering to layout persistence. The underlying dashboard
 * remains responsible for all work-item data; this layer only reorders,
 * sizes, and visually composes the rendered sections.
 */
export class CustomizableOnProgramDashboardView extends OnProgramDashboardView {
  private widthMode: DashboardWidth = "centered";
  private sectionLayout: DashboardSectionLayout[] = defaultDashboardLayout();
  private customizing = false;
  private draggedSection?: DashboardSectionId;

  constructor(
    controller: QueryController,
    private readonly layoutHostEl: HTMLElement,
    adapter: BasesWorkItemAdapter,
    taskCreator: TaskCreator,
    projectAssignment: ProjectAssignmentService,
    workItemOpener: WorkItemOpener,
    linkedMarkdownStore: LinkedMarkdownInstanceStore,
    errorHandler: ErrorHandler
  ) {
    super(
      controller,
      layoutHostEl,
      adapter,
      taskCreator,
      projectAssignment,
      workItemOpener,
      linkedMarkdownStore,
      errorHandler
    );
  }

  onDataUpdated(): void {
    super.onDataUpdated();
    this.enhanceDashboard();
  }

  private enhanceDashboard(): void {
    this.syncLayoutConfig();

    const shell = this.layoutHostEl.querySelector(".onprogram-dashboard-shell") as HTMLElement | null;
    const headerActions = shell?.querySelector(".onprogram-dashboard-header-actions") as HTMLElement | null;
    const grid = shell?.querySelector(".onprogram-dashboard-main-grid") as HTMLElement | null;
    if (!shell || !headerActions || !grid) return;

    shell.querySelectorAll(
      ".onprogram-dashboard-layout-controls, .onprogram-dashboard-customizer, .onprogram-dashboard-all-hidden-layout, .onprogram-dashboard-eyebrow"
    ).forEach((element) => element.remove());
    this.layoutHostEl.querySelectorAll("style[data-onprogram-dashboard-layout]")
      .forEach((element) => element.remove());

    const style = this.layoutHostEl.createEl("style");
    style.dataset.onprogramDashboardLayout = "true";
    style.textContent = LAYOUT_STYLES;

    shell.dataset.dashboardWidth = this.widthMode;
    this.decorateHeader(shell);
    this.renderHeaderControls(headerActions);
    if (this.customizing) this.renderCustomizer(shell, grid);
    this.applySectionLayout(grid);
  }

  private decorateHeader(shell: HTMLElement): void {
    const heading = shell.querySelector(".onprogram-dashboard-heading") as HTMLElement | null;
    const title = heading?.querySelector("h2") as HTMLElement | null;
    if (!heading || !title) return;

    const eyebrow = heading.createDiv({
      text: "ONPROGRAM · COMMAND CENTER",
      cls: "onprogram-dashboard-eyebrow"
    });
    heading.insertBefore(eyebrow, title);
  }

  private syncLayoutConfig(): void {
    try {
      const width = this.config.get("dashboardWidth");
      if (width === "centered" || width === "full") this.widthMode = width;

      const rawLayout = this.config.get("dashboardLayout");
      this.sectionLayout = normalizeDashboardLayout(rawLayout);

      const version = this.config.get("dashboardLayoutVersion");
      if (version !== DASHBOARD_LAYOUT_VERSION) {
        if (isLegacyDefaultLayout(this.sectionLayout)) {
          this.sectionLayout = defaultDashboardLayout();
          this.persistOption("dashboardLayout", JSON.stringify(this.sectionLayout));
        }
        this.persistOption("dashboardLayoutVersion", DASHBOARD_LAYOUT_VERSION);
      }
    } catch {
      // The Base can briefly instantiate a view before its configuration exists.
    }
  }

  private persistOption(key: string, value: string): void {
    try {
      this.config.set(key, value);
    } catch {
      // Layout controls remain usable for the current session if persistence fails.
    }
  }

  private persistLayout(): void {
    this.persistOption("dashboardLayout", JSON.stringify(this.sectionLayout));
  }

  private renderHeaderControls(parent: HTMLElement): void {
    const controls = parent.createDiv({ cls: "onprogram-dashboard-layout-controls" });
    const width = controls.createDiv({ cls: "onprogram-dashboard-layout-width" });

    for (const mode of ["centered", "full"] as const) {
      const button = width.createEl("button", {
        text: mode === "centered" ? "Centered" : "Full width",
        cls: this.widthMode === mode ? "is-active" : ""
      });
      button.setAttr("aria-pressed", this.widthMode === mode ? "true" : "false");
      button.addEventListener("click", () => {
        if (this.widthMode === mode) return;
        this.widthMode = mode;
        this.persistOption("dashboardWidth", mode);
        this.enhanceDashboard();
      });
    }

    const customize = controls.createEl("button", {
      text: this.customizing ? "Done" : "Customize dashboard",
      cls: this.customizing ? "mod-cta" : ""
    });
    customize.addEventListener("click", () => {
      this.customizing = !this.customizing;
      this.enhanceDashboard();
    });

    parent.prepend(controls);
  }

  private renderCustomizer(shell: HTMLElement, grid: HTMLElement): void {
    const panel = shell.ownerDocument.createElement("div");
    panel.className = "onprogram-dashboard-customizer";

    const header = panel.createDiv({ cls: "onprogram-dashboard-customizer-header" });
    const copy = header.createDiv();
    copy.createEl("h3", { text: "Arrange dashboard" });
    copy.createDiv({
      text: "Drag sections into order, hide what you do not need, and choose half or full-row widgets.",
      cls: "onprogram-dashboard-customizer-description"
    });
    const reset = header.createEl("button", { text: "Reset layout" });
    reset.addEventListener("click", () => {
      this.sectionLayout = defaultDashboardLayout();
      this.persistLayout();
      this.enhanceDashboard();
    });

    const list = panel.createDiv({ cls: "onprogram-dashboard-customizer-list" });
    this.sectionLayout.forEach((section, index) => {
      const definition = getSectionDefinition(section.id);
      const row = list.createDiv({ cls: "onprogram-dashboard-customizer-row" });
      row.draggable = true;
      row.dataset.section = section.id;

      row.addEventListener("dragstart", (event) => {
        this.draggedSection = section.id;
        row.addClass("is-dragging");
        event.dataTransfer?.setData("text/plain", section.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });
      row.addEventListener("dragend", () => {
        this.draggedSection = undefined;
        row.removeClass("is-dragging");
      });
      row.addEventListener("dragover", (event) => {
        event.preventDefault();
        row.addClass("is-drop-target");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });
      row.addEventListener("dragleave", () => row.removeClass("is-drop-target"));
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.removeClass("is-drop-target");
        const rawSource = this.draggedSection ?? event.dataTransfer?.getData("text/plain");
        if (!rawSource || !isDashboardSectionId(rawSource) || rawSource === section.id) return;
        this.reorderSection(rawSource, section.id);
      });

      const handle = row.createDiv({ text: "⋮⋮", cls: "onprogram-dashboard-customizer-handle" });
      handle.setAttr("title", "Drag to reorder");

      const identity = row.createDiv({ cls: "onprogram-dashboard-customizer-identity" });
      identity.createEl("strong", { text: definition.label });
      identity.createSpan({ text: definition.description });

      const rowControls = row.createDiv({ cls: "onprogram-dashboard-customizer-controls" });
      const visibility = rowControls.createEl("label", { cls: "onprogram-dashboard-customizer-visibility" });
      const checkbox = visibility.createEl("input", { type: "checkbox" });
      checkbox.checked = section.visible;
      checkbox.addEventListener("change", () => {
        section.visible = checkbox.checked;
        this.persistLayout();
        this.enhanceDashboard();
      });
      visibility.createSpan({ text: "Show" });

      if (definition.fixedSpan) {
        rowControls.createSpan({ text: "Full row", cls: "onprogram-dashboard-customizer-fixed" });
      } else {
        const span = rowControls.createEl("select", { cls: "dropdown" });
        span.createEl("option", { text: "Half row", value: "half" });
        span.createEl("option", { text: "Full row", value: "full" });
        span.value = section.span;
        span.setAttr("aria-label", `${definition.label} width`);
        span.addEventListener("change", () => {
          section.span = span.value === "full" ? "full" : "half";
          this.persistLayout();
          this.enhanceDashboard();
        });
      }

      const move = rowControls.createDiv({ cls: "onprogram-dashboard-customizer-move" });
      const up = move.createEl("button", { text: "↑" });
      up.disabled = index === 0;
      up.setAttr("title", `Move ${definition.label} up`);
      up.addEventListener("click", () => this.moveSection(section.id, -1));
      const down = move.createEl("button", { text: "↓" });
      down.disabled = index === this.sectionLayout.length - 1;
      down.setAttr("title", `Move ${definition.label} down`);
      down.addEventListener("click", () => this.moveSection(section.id, 1));
    });

    shell.insertBefore(panel, grid);
  }

  private applySectionLayout(grid: HTMLElement): void {
    const nodes = this.findSectionNodes(grid);
    let visibleCount = 0;

    for (const section of this.sectionLayout) {
      const node = nodes.get(section.id);
      if (!node) continue;

      node.dataset.dashboardSection = section.id;
      node.classList.toggle("onprogram-dashboard-section-hidden", !section.visible);
      node.classList.toggle("is-wide", section.id === "summary" || section.span === "full");
      this.decorateSection(node, section.id);
      if (section.visible) visibleCount += 1;
      grid.appendChild(node);
    }

    if (visibleCount === 0) {
      const empty = grid.createDiv({ cls: "onprogram-dashboard-all-hidden-layout" });
      empty.createEl("strong", { text: "All dashboard sections are hidden" });
      empty.createDiv({ text: "Choose Customize dashboard to turn sections back on." });
    }
  }

  private decorateSection(node: HTMLElement, id: DashboardSectionId): void {
    if (id === "summary") return;
    const header = node.querySelector(".onprogram-dashboard-panel-header") as HTMLElement | null;
    if (!header) return;
    header.querySelectorAll(":scope > .onprogram-dashboard-section-icon").forEach((element) => element.remove());
    const icon = header.createDiv({
      text: SECTION_SYMBOLS[id],
      cls: "onprogram-dashboard-section-icon"
    });
    icon.setAttr("aria-hidden", "true");
    header.prepend(icon);
  }

  private findSectionNodes(grid: HTMLElement): Map<DashboardSectionId, HTMLElement> {
    const nodes = new Map<DashboardSectionId, HTMLElement>();
    const shell = grid.parentElement;
    const summary = shell?.querySelector(".onprogram-dashboard-summary") as HTMLElement | null;
    if (summary) nodes.set("summary", summary);

    const titleToId = new Map<string, DashboardSectionId>([
      ["Needs attention", "attention"],
      ["Up next", "upcoming"],
      ["Board", "board"],
      ["Calendar", "calendar"],
      ["Projects", "projects"],
      ["Publishing", "publishing"]
    ]);

    for (const panel of Array.from(grid.querySelectorAll(":scope > .onprogram-dashboard-panel"))) {
      const element = panel as HTMLElement;
      const title = element.querySelector(".onprogram-dashboard-panel-header h3")?.textContent?.trim();
      const id = title ? titleToId.get(title) : undefined;
      if (id) nodes.set(id, element);
    }

    return nodes;
  }

  private reorderSection(sourceId: DashboardSectionId, targetId: DashboardSectionId): void {
    const sourceIndex = this.sectionLayout.findIndex((section) => section.id === sourceId);
    const targetIndex = this.sectionLayout.findIndex((section) => section.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;

    const [moved] = this.sectionLayout.splice(sourceIndex, 1);
    if (!moved) return;
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    this.sectionLayout.splice(insertAt, 0, moved);
    this.persistLayout();
    this.enhanceDashboard();
  }

  private moveSection(id: DashboardSectionId, delta: -1 | 1): void {
    const index = this.sectionLayout.findIndex((section) => section.id === id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= this.sectionLayout.length) return;

    const [moved] = this.sectionLayout.splice(index, 1);
    if (!moved) return;
    this.sectionLayout.splice(next, 0, moved);
    this.persistLayout();
    this.enhanceDashboard();
  }
}

function defaultDashboardLayout(): DashboardSectionLayout[] {
  return DASHBOARD_SECTIONS.map((section) => ({
    id: section.id,
    visible: true,
    span: section.fixedSpan ?? section.defaultSpan
  }));
}

function legacyDefaultDashboardLayout(): DashboardSectionLayout[] {
  return [
    { id: "summary", visible: true, span: "full" },
    { id: "attention", visible: true, span: "full" },
    { id: "upcoming", visible: true, span: "half" },
    { id: "board", visible: true, span: "full" },
    { id: "calendar", visible: true, span: "full" },
    { id: "projects", visible: true, span: "half" },
    { id: "publishing", visible: true, span: "half" }
  ];
}

function isLegacyDefaultLayout(layout: readonly DashboardSectionLayout[]): boolean {
  const legacy = legacyDefaultDashboardLayout();
  return layout.length === legacy.length && layout.every((section, index) => {
    const expected = legacy[index];
    return Boolean(
      expected
      && section.id === expected.id
      && section.visible === expected.visible
      && section.span === expected.span
    );
  });
}

function normalizeDashboardLayout(raw: unknown): DashboardSectionLayout[] {
  let parsed: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
  }

  const defaults = defaultDashboardLayout();
  if (!Array.isArray(parsed)) return defaults;

  const fallbackById = new Map(defaults.map((section) => [section.id, section]));
  const normalized: DashboardSectionLayout[] = [];
  const seen = new Set<DashboardSectionId>();

  for (const candidate of parsed) {
    if (!candidate || typeof candidate !== "object") continue;
    const value = candidate as Record<string, unknown>;
    if (typeof value.id !== "string" || !isDashboardSectionId(value.id) || seen.has(value.id)) continue;

    const fallback = fallbackById.get(value.id);
    if (!fallback) continue;
    const definition = getSectionDefinition(value.id);
    normalized.push({
      id: value.id,
      visible: typeof value.visible === "boolean" ? value.visible : fallback.visible,
      span: definition.fixedSpan
        ?? (value.span === "full" ? "full" : value.span === "half" ? "half" : fallback.span)
    });
    seen.add(value.id);
  }

  for (const fallback of defaults) {
    if (!seen.has(fallback.id)) normalized.push(fallback);
  }
  return normalized;
}

function isDashboardSectionId(value: string): value is DashboardSectionId {
  return DASHBOARD_SECTIONS.some((section) => section.id === value);
}

function getSectionDefinition(id: DashboardSectionId): DashboardSectionDefinition {
  return DASHBOARD_SECTIONS.find((section) => section.id === id) ?? DASHBOARD_SECTIONS[0]!;
}

const LAYOUT_STYLES = `
.onprogram-dashboard-view {
  padding: clamp(14px, 1.7vw, 26px) !important;
  background:
    radial-gradient(circle at 12% -8%, color-mix(in srgb, var(--interactive-accent) 7%, transparent), transparent 30%),
    var(--background-primary);
}

.onprogram-dashboard-shell {
  width: min(1480px, 100%) !important;
  margin: 0 auto;
}

.onprogram-dashboard-shell[data-dashboard-width="full"] {
  width: 100% !important;
  max-width: none !important;
}

/* Hero */
.onprogram-dashboard-header {
  position: relative;
  isolation: isolate;
  min-height: 142px;
  margin-bottom: 14px !important;
  padding: 22px 24px !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 20%, var(--background-modifier-border));
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 12%, color-mix(in srgb, var(--interactive-accent) 18%, transparent), transparent 31%),
    linear-gradient(118deg,
      color-mix(in srgb, var(--background-secondary) 86%, var(--interactive-accent) 14%),
      color-mix(in srgb, var(--background-primary) 94%, var(--interactive-accent) 6%) 54%,
      var(--background-secondary));
  box-shadow: 0 14px 34px rgba(0, 0, 0, .10);
}

.onprogram-dashboard-header::before,
.onprogram-dashboard-header::after {
  content: "";
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.onprogram-dashboard-header::before {
  inset: auto -4% -58% 42%;
  height: 132%;
  opacity: .45;
  transform: rotate(-4deg);
  background:
    linear-gradient(135deg, transparent 47%, color-mix(in srgb, var(--interactive-accent) 15%, transparent) 47% 50%, transparent 50%),
    linear-gradient(45deg, transparent 42%, color-mix(in srgb, var(--text-faint) 12%, transparent) 42% 48%, transparent 48%);
}

.onprogram-dashboard-header::after {
  inset: 0;
  background: linear-gradient(90deg, transparent 0 58%, color-mix(in srgb, var(--background-primary) 5%, transparent));
}

.onprogram-dashboard-heading {
  position: relative;
  z-index: 1;
  max-width: 680px;
}

.onprogram-dashboard-eyebrow {
  margin-bottom: 8px;
  color: var(--interactive-accent);
  font-size: 10px;
  font-weight: var(--font-semibold);
  letter-spacing: .13em;
  text-transform: uppercase;
}

.onprogram-dashboard-heading h2 {
  margin: 0 0 7px !important;
  font-size: clamp(30px, 3vw, 42px) !important;
  line-height: 1.04;
  letter-spacing: -.03em;
}

.onprogram-dashboard-subtitle {
  color: color-mix(in srgb, var(--text-muted) 88%, var(--text-normal));
  font-size: var(--font-ui-small) !important;
}

.onprogram-dashboard-header-actions {
  position: relative;
  z-index: 1;
  align-self: flex-end;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.onprogram-dashboard-header-actions > button,
.onprogram-dashboard-layout-controls > button {
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 76%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--background-primary) 74%, transparent);
  box-shadow: none;
  backdrop-filter: blur(8px);
}

/* Summary row */
.onprogram-dashboard-main-grid > .onprogram-dashboard-summary {
  grid-column: 1 / -1;
  margin-bottom: 0 !important;
}

.onprogram-dashboard-summary {
  gap: 12px !important;
}

.onprogram-dashboard-stat {
  position: relative;
  min-height: 76px;
  padding: 13px 14px !important;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 16%, var(--background-modifier-border)) !important;
  border-radius: 13px !important;
  background:
    linear-gradient(145deg,
      color-mix(in srgb, var(--background-secondary) 88%, var(--interactive-accent) 12%),
      color-mix(in srgb, var(--background-primary) 96%, var(--interactive-accent) 4%)) !important;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-normal) 4%, transparent);
}

.onprogram-dashboard-stat::after {
  content: "";
  position: absolute;
  inset: auto 14px 0 56px;
  height: 2px;
  border-radius: 999px;
  opacity: .55;
  background: linear-gradient(90deg, transparent, var(--interactive-accent), transparent);
}

.onprogram-dashboard-stat-icon {
  width: 39px !important;
  height: 39px !important;
  flex-basis: 39px !important;
  border-radius: 10px !important;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 22%, transparent);
  background: color-mix(in srgb, var(--interactive-accent) 14%, transparent) !important;
  box-shadow: inset 0 0 18px color-mix(in srgb, var(--interactive-accent) 5%, transparent);
}

.onprogram-dashboard-stat strong {
  font-size: 24px !important;
  letter-spacing: -.025em;
}

.onprogram-dashboard-stat span {
  margin-top: 1px !important;
  font-size: 11px !important;
}

/* Main composition */
.onprogram-dashboard-main-grid {
  gap: 14px !important;
}

.onprogram-dashboard-panel {
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 82%, var(--interactive-accent) 18%) !important;
  border-radius: 14px !important;
  background: color-mix(in srgb, var(--background-primary) 84%, var(--background-secondary) 16%) !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, .055);
}

.onprogram-dashboard-panel-header {
  justify-content: flex-start !important;
  gap: 10px;
  padding: 13px 15px 10px !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 58%, transparent);
}

.onprogram-dashboard-panel-header > div:not(.onprogram-dashboard-section-icon) {
  min-width: 0;
}

.onprogram-dashboard-panel-header h3 {
  margin: 0 0 1px !important;
  font-size: 13px !important;
  font-weight: var(--font-semibold);
  letter-spacing: -.01em;
}

.onprogram-dashboard-panel-subtitle {
  font-size: 10px !important;
  line-height: 1.35;
}

.onprogram-dashboard-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 29px;
  height: 29px;
  flex: 0 0 29px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 18%, transparent);
  border-radius: 9px;
  color: var(--interactive-accent);
  background: color-mix(in srgb, var(--interactive-accent) 11%, transparent);
  font-size: 13px;
  font-weight: var(--font-bold);
}

.onprogram-dashboard-panel-body {
  padding: 11px 14px 14px !important;
}

/* Needs attention */
.onprogram-dashboard-attention-list,
.onprogram-dashboard-upcoming-list,
.onprogram-dashboard-project-list,
.onprogram-dashboard-publishing-list {
  gap: 0 !important;
}

.onprogram-dashboard-attention-row {
  display: grid !important;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 8px !important;
  min-height: 34px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-attention-row:last-child,
.onprogram-dashboard-upcoming-row:last-child,
.onprogram-dashboard-publishing-row:last-child {
  border-bottom: 0;
}

.onprogram-dashboard-attention-marker {
  width: 8px !important;
  height: 8px !important;
  min-width: 8px;
  padding: 0 !important;
  overflow: hidden;
  border-radius: 999px !important;
  color: transparent !important;
}

.onprogram-dashboard-attention-marker.is-overdue { background: var(--text-error) !important; }
.onprogram-dashboard-attention-marker.is-blocked { background: var(--color-orange) !important; }
.onprogram-dashboard-attention-marker.is-waiting { background: var(--color-yellow) !important; }

.onprogram-dashboard-item-title {
  min-width: 0;
  padding-inline: 8px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px !important;
  font-weight: var(--font-medium);
}

.onprogram-dashboard-attention-row .onprogram-dashboard-row-meta {
  justify-content: flex-end;
  white-space: nowrap;
  font-size: 9px !important;
}

/* Up next */
.onprogram-dashboard-upcoming-row {
  gap: 10px !important;
  min-height: 39px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-date-block {
  width: 42px !important;
  min-width: 42px !important;
  height: 31px;
  padding: 3px 5px !important;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 16%, var(--background-modifier-border));
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--interactive-accent) 6%, var(--background-secondary));
}

.onprogram-dashboard-date-block strong {
  font-size: 11px !important;
  line-height: 1;
}

.onprogram-dashboard-date-block span {
  font-size: 8px !important;
}

.onprogram-dashboard-upcoming-main {
  min-width: 0;
}

.onprogram-dashboard-upcoming-main .onprogram-dashboard-row-meta {
  margin-top: 2px;
  font-size: 9px !important;
}

/* Board */
.onprogram-dashboard-board {
  gap: 11px !important;
}

.onprogram-dashboard-board-column {
  padding: 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent) !important;
  border-radius: 11px !important;
  background: color-mix(in srgb, var(--background-secondary) 64%, transparent) !important;
}

.onprogram-dashboard-board-column-header {
  margin-bottom: 7px;
  font-size: 10px !important;
  font-weight: var(--font-semibold);
}

.onprogram-dashboard-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--background-modifier-hover);
  color: var(--text-muted);
  font-size: 9px;
}

.onprogram-dashboard-board-cards {
  gap: 6px !important;
}

.onprogram-dashboard-board-card {
  min-height: 38px;
  padding: 8px 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 68%, transparent) !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--background-primary) 88%, var(--background-secondary) 12%) !important;
  box-shadow: none !important;
}

.onprogram-dashboard-board-card-meta {
  margin-top: 4px !important;
  font-size: 8px !important;
}

/* Calendar strip */
.onprogram-dashboard-calendar {
  gap: 9px !important;
}

.onprogram-dashboard-calendar-day {
  min-height: 90px !important;
  padding: 9px !important;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent) !important;
  border-radius: 10px !important;
  background: color-mix(in srgb, var(--background-secondary) 46%, transparent) !important;
}

.onprogram-dashboard-calendar-day.is-today {
  border-color: color-mix(in srgb, var(--interactive-accent) 70%, var(--background-modifier-border)) !important;
  background: color-mix(in srgb, var(--interactive-accent) 7%, var(--background-secondary)) !important;
  box-shadow: inset 0 -2px 0 var(--interactive-accent);
}

.onprogram-dashboard-calendar-day-header {
  margin-bottom: 7px !important;
}

.onprogram-dashboard-calendar-day-header span {
  font-size: 9px !important;
  text-transform: uppercase;
  letter-spacing: .05em;
}

.onprogram-dashboard-calendar-day-header strong {
  font-size: 15px !important;
}

.onprogram-dashboard-calendar-day-tasks {
  gap: 4px !important;
}

.onprogram-dashboard-calendar-task {
  padding: 3px 5px !important;
  border-radius: 5px !important;
  font-size: 8px !important;
  line-height: 1.15;
}

/* Projects */
.onprogram-dashboard-project-card {
  padding: 8px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-project-card:last-child { border-bottom: 0; }

.onprogram-dashboard-project-top {
  gap: 8px;
}

.onprogram-dashboard-project-title {
  font-size: 11px !important;
  font-weight: var(--font-medium) !important;
}

.onprogram-dashboard-project-status {
  padding: 2px 6px !important;
  border-radius: 999px !important;
  background: color-mix(in srgb, var(--interactive-accent) 8%, var(--background-secondary));
  font-size: 8px !important;
}

.onprogram-dashboard-project-progress-meta {
  margin: 5px 0 3px !important;
  font-size: 8px !important;
}

.onprogram-dashboard-project-progress-track {
  height: 4px !important;
  border-radius: 999px !important;
  background: var(--background-modifier-border) !important;
}

.onprogram-dashboard-project-progress-fill {
  border-radius: 999px !important;
  background: var(--interactive-accent) !important;
}

.onprogram-dashboard-project-card .onprogram-dashboard-row-meta {
  margin-top: 4px;
  font-size: 8px !important;
}

/* Publishing */
.onprogram-dashboard-publishing-row {
  min-height: 35px;
  padding: 6px 0 !important;
  border-bottom: 1px solid color-mix(in srgb, var(--background-modifier-border) 52%, transparent);
}

.onprogram-dashboard-publishing-main {
  min-width: 0;
}

.onprogram-dashboard-publishing-date {
  margin-top: 2px;
  font-size: 8px !important;
}

.onprogram-dashboard-publishing-pills {
  gap: 4px !important;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-dashboard-publishing-pill {
  padding: 2px 6px !important;
  border-radius: 999px !important;
  font-size: 8px !important;
}

/* Layout controls */
.onprogram-dashboard-layout-controls,
.onprogram-dashboard-layout-width,
.onprogram-dashboard-customizer-header,
.onprogram-dashboard-customizer-row,
.onprogram-dashboard-customizer-controls,
.onprogram-dashboard-customizer-visibility,
.onprogram-dashboard-customizer-move {
  display: flex;
  align-items: center;
}

.onprogram-dashboard-layout-controls {
  gap: 7px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.onprogram-dashboard-layout-width {
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--background-modifier-border) 70%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--background-primary) 68%, transparent);
  backdrop-filter: blur(8px);
}

.onprogram-dashboard-layout-width button {
  height: 27px;
  padding: 0 9px;
  border: 0;
  border-radius: 6px;
  box-shadow: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 10px;
}

.onprogram-dashboard-layout-width button.is-active {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

/* Customizer */
.onprogram-dashboard-customizer {
  margin-bottom: 14px;
  padding: 13px;
  border: 1px solid color-mix(in srgb, var(--interactive-accent) 65%, var(--background-modifier-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--interactive-accent) 4%, var(--background-primary));
  box-shadow: 0 8px 22px rgba(0, 0, 0, .05);
}

.onprogram-dashboard-customizer-header {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.onprogram-dashboard-customizer-header h3 { margin: 0 0 2px; }
.onprogram-dashboard-customizer-description,
.onprogram-dashboard-customizer-identity span,
.onprogram-dashboard-customizer-fixed {
  color: var(--text-muted);
  font-size: var(--font-ui-smaller);
}

.onprogram-dashboard-customizer-list {
  display: grid;
  gap: 5px;
}

.onprogram-dashboard-customizer-row {
  gap: 8px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 9px;
  background: var(--background-primary);
}

.onprogram-dashboard-customizer-row.is-dragging { opacity: .5; }
.onprogram-dashboard-customizer-row.is-drop-target { border-color: var(--interactive-accent); }

.onprogram-dashboard-customizer-handle {
  flex: 0 0 auto;
  color: var(--text-faint);
  cursor: grab;
  font-weight: var(--font-bold);
  letter-spacing: -3px;
}

.onprogram-dashboard-customizer-identity {
  flex: 1 1 auto;
  min-width: 160px;
}

.onprogram-dashboard-customizer-identity strong,
.onprogram-dashboard-customizer-identity span { display: block; }
.onprogram-dashboard-customizer-controls { gap: 8px; flex: 0 0 auto; }
.onprogram-dashboard-customizer-visibility { gap: 6px; color: var(--text-muted); }
.onprogram-dashboard-customizer-move { gap: 2px; }
.onprogram-dashboard-customizer-move button { min-width: 32px; padding: 0 8px; }
.onprogram-dashboard-customizer-fixed { min-width: 82px; text-align: center; }

.onprogram-dashboard-section-hidden { display: none !important; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-board { grid-template-columns: 1fr; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-calendar {
  overflow-x: auto;
  grid-template-columns: repeat(7, minmax(105px, 1fr));
}

.onprogram-dashboard-all-hidden-layout {
  grid-column: 1 / -1;
  padding: 24px;
  border: 1px dashed var(--background-modifier-border);
  border-radius: 14px;
  color: var(--text-muted);
  text-align: center;
}
.onprogram-dashboard-all-hidden-layout strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-normal);
}

@media (max-width: 1100px) {
  .onprogram-dashboard-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
  .onprogram-dashboard-header {
    min-height: 124px;
    align-items: flex-start !important;
  }
}

@media (max-width: 820px) {
  .onprogram-dashboard-header {
    min-height: 0;
    flex-direction: column;
  }
  .onprogram-dashboard-header-actions {
    width: 100%;
    align-self: auto;
    justify-content: flex-start;
  }
  .onprogram-dashboard-layout-controls { justify-content: flex-start; }
  .onprogram-dashboard-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .onprogram-dashboard-main-grid {
    grid-template-columns: 1fr !important;
  }
  .onprogram-dashboard-main-grid > .onprogram-dashboard-summary,
  .onprogram-dashboard-panel.is-wide {
    grid-column: auto !important;
  }
}

@media (max-width: 620px) {
  .onprogram-dashboard-view { padding: 10px !important; }
  .onprogram-dashboard-header { padding: 17px !important; }
  .onprogram-dashboard-summary { grid-template-columns: 1fr !important; }
  .onprogram-dashboard-customizer-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .onprogram-dashboard-customizer-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .onprogram-dashboard-customizer-controls {
    width: calc(100% - 24px);
    margin-left: 24px;
    flex-wrap: wrap;
  }
  .onprogram-dashboard-attention-row {
    grid-template-columns: 18px minmax(0, 1fr);
  }
  .onprogram-dashboard-attention-row .onprogram-dashboard-row-meta {
    grid-column: 2;
    justify-content: flex-start;
  }
}
`;
