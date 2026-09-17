import { Menu, Modal, Notice, Setting, TFile, type App } from "obsidian";

export interface PerformanceMetricsSettings {
  badgeProperty: string;
  corePropertyNames: string[];
}

interface MetricDefinition {
  key: string;
  label: string;
  description?: string;
  numeric: boolean;
}

const VIEW_METRICS: readonly MetricDefinition[] = [
  {
    key: "views_24_hours",
    label: "Views — 24 hours",
    description: "Shown by the 24-hour views badge when that metric is selected.",
    numeric: true
  },
  {
    key: "views_1_week",
    label: "Views — 1 week",
    description: "Included in the views breakdown tooltip.",
    numeric: true
  },
  {
    key: "views_1_month",
    label: "Views — 1 month",
    description: "Included in the views breakdown tooltip.",
    numeric: true
  }
];

export class PerformanceMetricsService {
  constructor(
    private readonly app: App,
    private readonly getSettings: () => PerformanceMetricsSettings
  ) {}

  addMenuItemForPath(menu: Menu, path: string): void {
    menu.addItem((item) => item
      .setTitle("Edit performance metrics…")
      .setIcon("chart-no-axes-column-increasing")
      .onClick(() => this.open(path)));
  }

  open(path: string): void {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`OnProgram: Could not find ${path}.`);
      return;
    }

    new PerformanceMetricsModal(
      this.app,
      file,
      this.getSettings()
    ).open();
  }
}

class PerformanceMetricsModal extends Modal {
  private readonly values = new Map<string, string>();
  private readonly customMetricKeys: string[] = [];
  private fixedMetrics: MetricDefinition[] = [];
  private pendingMetricName = "";
  private pendingMetricValue = "";
  private saving = false;

  constructor(
    app: App,
    private readonly file: TFile,
    private readonly settings: PerformanceMetricsSettings
  ) {
    super(app);
  }

  onOpen(): void {
    this.modalEl.addClass("onprogram-metrics-modal");
    this.initializeDraft();
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private initializeDraft(): void {
    const frontmatter = this.app.metadataCache.getFileCache(this.file)?.frontmatter ?? {};
    const badgeProperty = this.settings.badgeProperty.trim() || "grade";

    this.fixedMetrics = dedupeMetrics([
      {
        key: badgeProperty,
        label: badgeProperty === "grade" ? "Grade / score" : `Badge — ${badgeProperty}`,
        description: "The primary badge value shown on supported OnProgram cards.",
        numeric: false
      },
      ...VIEW_METRICS
    ]);

    const fixedKeys = new Set(this.fixedMetrics.map((metric) => metric.key));
    const excludedKeys = new Set(this.settings.corePropertyNames);

    for (const metric of this.fixedMetrics) {
      this.values.set(metric.key, frontmatterValue(frontmatter[metric.key]));
    }

    for (const [key, value] of Object.entries(frontmatter)) {
      if (fixedKeys.has(key) || excludedKeys.has(key)) continue;
      if (!isNumericLike(value)) continue;

      this.customMetricKeys.push(key);
      this.values.set(key, frontmatterValue(value));
    }
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "Performance metrics" });
    contentEl.createEl("p", {
      text: this.file.path,
      cls: "onprogram-editor-source"
    });
    contentEl.createEl("p", {
      text: "Edit badge and analytics values here instead of opening the note properties. Leave a value blank to remove that metric."
    });

    contentEl.createEl("h3", { text: "Card metrics" });
    for (const metric of this.fixedMetrics) {
      this.addMetricSetting(metric);
    }

    if (this.customMetricKeys.length > 0) {
      contentEl.createEl("h3", { text: "Other numeric metrics" });
      for (const key of this.customMetricKeys) {
        this.addMetricSetting({
          key,
          label: humanizeMetricKey(key),
          description: key,
          numeric: true
        });
      }
    }

    contentEl.createEl("h3", { text: "Add metric" });

    new Setting(contentEl)
      .setName("Property")
      .setDesc("Frontmatter key, for example likes_24_hours or shares_1_week.")
      .addText((text) => text
        .setPlaceholder("likes_24_hours")
        .setValue(this.pendingMetricName)
        .onChange((value) => { this.pendingMetricName = value; }));

    new Setting(contentEl)
      .setName("Value")
      .setDesc("Numeric value for the new metric.")
      .addText((text) => text
        .setPlaceholder("0")
        .setValue(this.pendingMetricValue)
        .onChange((value) => { this.pendingMetricValue = value; }))
      .addButton((button) => button
        .setButtonText("Add metric")
        .onClick(() => this.addPendingMetric()));

    const actions = contentEl.createDiv({ cls: "onprogram-editor-actions" });
    const spacer = actions.createSpan({ cls: "onprogram-editor-actions-spacer" });
    spacer.setText("");

    const cancelButton = actions.createEl("button", { text: "Cancel" });
    cancelButton.addEventListener("click", () => this.close());

    const saveButton = actions.createEl("button", {
      text: "Save",
      cls: "mod-cta"
    });
    saveButton.addEventListener("click", () => void this.save());
  }

  private addMetricSetting(metric: MetricDefinition): void {
    const setting = new Setting(this.contentEl)
      .setName(metric.label);

    if (metric.description) setting.setDesc(metric.description);

    setting.addText((text) => {
      text
        .setPlaceholder(metric.numeric ? "0" : "Value")
        .setValue(this.values.get(metric.key) ?? "")
        .onChange((value) => this.values.set(metric.key, value));

      text.inputEl.inputMode = metric.numeric ? "decimal" : "text";
    });
  }

  private addPendingMetric(): void {
    const key = this.pendingMetricName.trim();
    const value = this.pendingMetricValue.trim();

    if (!isValidMetricKey(key)) {
      new Notice("OnProgram: Metric property names can use letters, numbers, underscores, and hyphens.");
      return;
    }

    const fixedKeys = new Set(this.fixedMetrics.map((metric) => metric.key));
    if (!fixedKeys.has(key) && !this.customMetricKeys.includes(key)) {
      this.customMetricKeys.push(key);
    }

    this.values.set(key, value);
    this.pendingMetricName = "";
    this.pendingMetricValue = "";
    this.render();
  }

  private async save(): Promise<void> {
    if (this.saving) return;

    const definitions = [
      ...this.fixedMetrics,
      ...this.customMetricKeys.map((key) => ({
        key,
        label: humanizeMetricKey(key),
        numeric: true
      }))
    ];

    const normalized = new Map<string, string | number | undefined>();

    try {
      for (const metric of definitions) {
        const raw = (this.values.get(metric.key) ?? "").trim();

        if (!raw) {
          normalized.set(metric.key, undefined);
          continue;
        }

        if (metric.numeric) {
          const numeric = parseMetricNumber(raw);
          if (numeric === undefined) {
            throw new Error(`${metric.label} must be a number.`);
          }
          normalized.set(metric.key, numeric);
        } else {
          const numeric = parseMetricNumber(raw);
          normalized.set(metric.key, numeric ?? raw);
        }
      }
    } catch (error) {
      new Notice(`OnProgram: ${error instanceof Error ? error.message : "Invalid metric value."}`);
      return;
    }

    this.saving = true;
    this.modalEl.addClass("onprogram-is-busy");

    try {
      await this.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
        for (const [key, value] of normalized) {
          if (value === undefined) {
            delete frontmatter[key];
          } else {
            frontmatter[key] = value;
          }
        }
      });

      new Notice("OnProgram: performance metrics saved.");
      this.close();
    } catch (error) {
      new Notice(`OnProgram: Could not save performance metrics. ${error instanceof Error ? error.message : ""}`);
    } finally {
      this.saving = false;
      this.modalEl.removeClass("onprogram-is-busy");
    }
  }
}

function dedupeMetrics(metrics: MetricDefinition[]): MetricDefinition[] {
  const seen = new Set<string>();
  return metrics.filter((metric) => {
    if (!metric.key || seen.has(metric.key)) return false;
    seen.add(metric.key);
    return true;
  });
}

function frontmatterValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "string") return false;
  return parseMetricNumber(value) !== undefined;
}

function parseMetricNumber(value: string): number | undefined {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function isValidMetricKey(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function humanizeMetricKey(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
