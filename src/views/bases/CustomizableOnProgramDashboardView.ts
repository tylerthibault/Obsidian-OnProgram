import type { QueryController } from "obsidian";
import { LAYOUT_STYLES } from "./styles/CustomizableDashboardStyles";
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

