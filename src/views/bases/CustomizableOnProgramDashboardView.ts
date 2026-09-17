import type { QueryController } from "obsidian";
import type { ErrorHandler } from "../../core/ErrorHandler";
import type { BasesWorkItemAdapter } from "../../services/bases/BasesWorkItemAdapter";
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
    defaultSpan: "full"
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

/**
 * Adds per-Base presentation controls to the core Dashboard without coupling
 * dashboard data rendering to layout persistence. The underlying dashboard
 * remains responsible for all work-item data; this layer only reorders and
 * sizes the rendered sections.
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
    errorHandler: ErrorHandler
  ) {
    super(
      controller,
      layoutHostEl,
      adapter,
      taskCreator,
      projectAssignment,
      workItemOpener,
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

    shell.querySelectorAll(".onprogram-dashboard-layout-controls, .onprogram-dashboard-customizer, .onprogram-dashboard-all-hidden-layout")
      .forEach((element) => element.remove());
    this.layoutHostEl.querySelectorAll("style[data-onprogram-dashboard-layout]")
      .forEach((element) => element.remove());

    const style = this.layoutHostEl.createEl("style");
    style.dataset.onprogramDashboardLayout = "true";
    style.textContent = LAYOUT_STYLES;

    shell.dataset.dashboardWidth = this.widthMode;
    this.renderHeaderControls(headerActions);
    if (this.customizing) this.renderCustomizer(shell, grid);
    this.applySectionLayout(grid);
  }

  private syncLayoutConfig(): void {
    try {
      const width = this.config.get("dashboardWidth");
      if (width === "centered" || width === "full") this.widthMode = width;

      this.sectionLayout = normalizeDashboardLayout(this.config.get("dashboardLayout"));
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
      if (section.visible) visibleCount += 1;
      grid.appendChild(node);
    }

    if (visibleCount === 0) {
      const empty = grid.createDiv({ cls: "onprogram-dashboard-all-hidden-layout" });
      empty.createEl("strong", { text: "All dashboard sections are hidden" });
      empty.createDiv({ text: "Choose Customize dashboard to turn sections back on." });
    }
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
.onprogram-dashboard-shell[data-dashboard-width="full"] {
  width: 100% !important;
  max-width: none !important;
}

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
  gap: var(--size-4-2);
  flex-wrap: wrap;
}

.onprogram-dashboard-layout-width {
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
  background: var(--background-secondary);
}

.onprogram-dashboard-layout-width button {
  height: 28px;
  padding: 0 10px;
  border: 0;
  box-shadow: none;
  background: transparent;
  color: var(--text-muted);
}

.onprogram-dashboard-layout-width button.is-active {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.onprogram-dashboard-customizer {
  margin-bottom: var(--size-4-4);
  padding: var(--size-4-3);
  border: 1px solid var(--interactive-accent);
  border-radius: var(--radius-m);
  background: color-mix(in srgb, var(--interactive-accent) 5%, var(--background-primary));
}

.onprogram-dashboard-customizer-header {
  justify-content: space-between;
  gap: var(--size-4-3);
  margin-bottom: var(--size-4-3);
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
  gap: var(--size-4-1);
}

.onprogram-dashboard-customizer-row {
  gap: var(--size-4-2);
  min-width: 0;
  padding: var(--size-4-2) var(--size-4-3);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--radius-s);
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
.onprogram-dashboard-customizer-controls { gap: var(--size-4-2); flex: 0 0 auto; }
.onprogram-dashboard-customizer-visibility { gap: 6px; color: var(--text-muted); }
.onprogram-dashboard-customizer-move { gap: 2px; }
.onprogram-dashboard-customizer-move button { min-width: 32px; padding: 0 8px; }
.onprogram-dashboard-customizer-fixed { min-width: 82px; text-align: center; }

.onprogram-dashboard-main-grid > .onprogram-dashboard-summary {
  grid-column: 1 / -1;
  margin-bottom: 0;
}

.onprogram-dashboard-section-hidden { display: none !important; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-board { grid-template-columns: 1fr; }
.onprogram-dashboard-panel:not(.is-wide) .onprogram-dashboard-calendar {
  overflow-x: auto;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
}

.onprogram-dashboard-all-hidden-layout {
  grid-column: 1 / -1;
  padding: var(--size-4-6);
  border: 1px dashed var(--background-modifier-border);
  border-radius: var(--radius-m);
  color: var(--text-muted);
  text-align: center;
}
.onprogram-dashboard-all-hidden-layout strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-normal);
}

@media (max-width: 980px) {
  .onprogram-dashboard-main-grid > .onprogram-dashboard-summary { grid-column: auto; }
}

@media (max-width: 720px) {
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
}
`;
