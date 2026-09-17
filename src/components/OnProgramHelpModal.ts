import { Modal, Setting, type App } from "obsidian";
import type { WorkItemPropertyMap } from "../models/work-item/WorkItemProperties";

interface HelpAttribute {
  canonical: string;
  property: string;
  description: string;
  example: string;
  group: "Core" | "Scheduling" | "Relationships" | "Publishing" | "Analytics";
}

export class OnProgramHelpModal extends Modal {
  private query = "";
  private listEl?: HTMLElement;

  constructor(
    app: App,
    private readonly getPropertyMap: () => WorkItemPropertyMap
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.addClass("onprogram-help-modal");
    this.contentEl.createEl("h2", { text: "OnProgram Help" });
    this.contentEl.createEl("p", {
      text: "Quick reference for OnProgram task attributes. Property names reflect your current OnProgram mapping.",
      cls: "onprogram-help-intro"
    });

    new Setting(this.contentEl)
      .setName("Search attributes")
      .addSearch((search) => {
        search
          .setPlaceholder("status, scheduled, publishing, views…")
          .onChange((value) => {
            this.query = value.trim().toLowerCase();
            this.renderAttributes();
          });
        window.setTimeout(() => search.inputEl.focus(), 0);
      });

    this.listEl = this.contentEl.createDiv({ cls: "onprogram-help-list" });
    this.renderAttributes();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private renderAttributes(): void {
    const listEl = this.listEl;
    if (!listEl) return;
    listEl.empty();

    const attributes = buildAttributes(this.getPropertyMap()).filter((attribute) => {
      if (!this.query) return true;
      return [
        attribute.canonical,
        attribute.property,
        attribute.description,
        attribute.example,
        attribute.group
      ].some((value) => value.toLowerCase().includes(this.query));
    });

    if (attributes.length === 0) {
      listEl.createDiv({ text: "No matching OnProgram attributes.", cls: "onprogram-help-empty" });
      return;
    }

    let currentGroup = "";
    for (const attribute of attributes) {
      if (attribute.group !== currentGroup) {
        currentGroup = attribute.group;
        listEl.createEl("h3", { text: currentGroup, cls: "onprogram-help-group" });
      }

      const row = listEl.createDiv({ cls: "onprogram-help-attribute" });
      const header = row.createDiv({ cls: "onprogram-help-attribute-header" });
      header.createEl("code", { text: attribute.property });
      if (attribute.property !== attribute.canonical) {
        header.createSpan({ text: `OnProgram: ${attribute.canonical}`, cls: "onprogram-help-canonical" });
      }
      row.createDiv({ text: attribute.description, cls: "onprogram-help-description" });
      const example = row.createDiv({ cls: "onprogram-help-example" });
      example.createSpan({ text: "Example: " });
      example.createEl("code", { text: `${attribute.property}: ${attribute.example}` });
    }
  }
}

function buildAttributes(map: WorkItemPropertyMap): HelpAttribute[] {
  return [
    { canonical: "type", property: map.type, group: "Core", description: "Work item type. Tasks normally use task.", example: "task" },
    { canonical: "status", property: map.status, group: "Core", description: "Workflow state used by Board columns and calendar status styling. Publishing platforms use their own separate state fields.", example: "todo" },
    { canonical: "project", property: map.project, group: "Core", description: "Optional project or initiative reference.", example: "OnProgram" },
    { canonical: "priority", property: map.priority, group: "Core", description: "Priority value displayed by supported views.", example: "high" },

    { canonical: "start", property: map.start, group: "Scheduling", description: "Start date or datetime for a work item or range.", example: "2026-09-17T09:00" },
    { canonical: "end", property: map.end, group: "Scheduling", description: "Optional end date or datetime for ranged work.", example: "2026-09-17T11:00" },
    { canonical: "due", property: map.due, group: "Scheduling", description: "Deadline date. Calendar can use this as its date field.", example: "2026-09-20" },
    { canonical: "scheduled", property: map.scheduled, group: "Scheduling", description: "The single publish/work date and time used by Calendar and Timeline. Platform states do not store duplicate schedule timestamps.", example: "2026-09-17T17:00" },
    { canonical: "duration", property: map.duration, group: "Scheduling", description: "Duration in minutes. Resizing timed Calendar items updates this value.", example: "90" },
    { canonical: "completed", property: map.completed, group: "Scheduling", description: "Completion timestamp/date written when work is completed.", example: "2026-09-17T18:30" },

    { canonical: "parent", property: map.parent, group: "Relationships", description: "Optional parent work item reference.", example: "[[Parent Task]]" },
    { canonical: "depends_on", property: map.dependsOn, group: "Relationships", description: "One or more work items this item depends on.", example: "[\"[[Design]]\", \"[[Approval]]\"]" },
    { canonical: "onprogram_base", property: map.linkedBase, group: "Relationships", description: "Links a Markdown work item to another OnProgram Base. Linked Base cards can also exist directly on a Board without a note.", example: "GCC/SMP/SMP.onprogram.base" },

    { canonical: "tiktok_state", property: "tiktok_state", group: "Publishing", description: "TikTok distribution state. The TT pill appears only when this property exists. Supported values: planned, scheduled, posted, failed, skipped. Scheduled uses the task's main scheduled date/time.", example: "scheduled" },
    { canonical: "tiktok_posted", property: "tiktok_posted", group: "Publishing", description: "Timestamp recorded when TikTok is marked Posted.", example: "2026-09-17T08:03" },
    { canonical: "youtube_state", property: "youtube_state", group: "Publishing", description: "YouTube distribution state. The YT pill appears only when this property exists. Scheduled uses the task's main scheduled date/time.", example: "scheduled" },
    { canonical: "youtube_posted", property: "youtube_posted", group: "Publishing", description: "Timestamp recorded when YouTube is marked Posted.", example: "2026-09-17T08:04" },
    { canonical: "instagram_state", property: "instagram_state", group: "Publishing", description: "Instagram distribution state. The IG pill appears only when this property exists. Scheduled uses the task's main scheduled date/time.", example: "planned" },
    { canonical: "instagram_posted", property: "instagram_posted", group: "Publishing", description: "Timestamp recorded when Instagram is marked Posted.", example: "2026-09-17T08:05" },

    { canonical: "grade", property: "grade", group: "Analytics", description: "Common badge property for a score or grade. The generic Badge property setting can point at any frontmatter key.", example: "8.5" },
    { canonical: "views_24_hours", property: "views_24_hours", group: "Analytics", description: "View count measured in the first 24 hours.", example: "1250" },
    { canonical: "views_1_week", property: "views_1_week", group: "Analytics", description: "View count measured over one week.", example: "8420" },
    { canonical: "views_1_month", property: "views_1_month", group: "Analytics", description: "View count measured over one month.", example: "31204" }
  ];
}
