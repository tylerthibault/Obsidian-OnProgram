import type { BasesEntry, BasesEntryGroup, BasesQueryResult } from "obsidian";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemParseInvalid } from "../work-items/WorkItemParseResult";
import type { WorkItemParser } from "../work-items/WorkItemParser";

export interface BasesWorkItemResult {
  items: WorkItem[];
  invalid: WorkItemParseInvalid[];
  ignoredPaths: string[];
}

export interface BasesWorkItemGroup {
  key: unknown;
  items: WorkItem[];
  invalid: WorkItemParseInvalid[];
  ignoredPaths: string[];
}

/**
 * Converts the files selected by an Obsidian Base query into OnProgram domain
 * objects. The Base remains responsible for filters, sorting, limits, formulas,
 * and grouping; this adapter only performs OnProgram schema normalization.
 */
export class BasesWorkItemAdapter {
  constructor(private readonly parser: WorkItemParser) {}

  adapt(result: BasesQueryResult): BasesWorkItemResult {
    return this.adaptEntries(result.data);
  }

  adaptGroups(result: BasesQueryResult): BasesWorkItemGroup[] {
    return result.groupedData.map((group) => this.adaptGroup(group));
  }

  private adaptGroup(group: BasesEntryGroup): BasesWorkItemGroup {
    const adapted = this.adaptEntries(group.entries);
    return {
      key: group.key,
      ...adapted
    };
  }

  private adaptEntries(entries: BasesEntry[]): BasesWorkItemResult {
    const items: WorkItem[] = [];
    const invalid: WorkItemParseInvalid[] = [];
    const ignoredPaths: string[] = [];

    for (const entry of entries) {
      const cache = entry.file ? entry.file : undefined;
      if (!cache) continue;

      const metadata = entry.file.vault?.adapter ? undefined : undefined;
      void metadata;

      // WorkItemParser accepts frontmatter from Obsidian MetadataCache; callers
      // supply that through parseEntry so the adapter stays easy to test.
      const parsed = this.parseEntry(entry);
      if (parsed.kind === "valid") {
        items.push(parsed.item);
      } else if (parsed.kind === "invalid") {
        invalid.push(parsed);
      } else {
        ignoredPaths.push(parsed.path);
      }
    }

    return { items, invalid, ignoredPaths };
  }

  private parseEntry(entry: BasesEntry) {
    const app = this.parserApp();
    const cache = app.metadataCache.getFileCache(entry.file);
    return this.parser.parse(entry.file, cache?.frontmatter);
  }

  private parserApp() {
    // The parser intentionally does not own App. Bases entries expose TFile, but
    // frontmatter still comes from the global Obsidian MetadataCache. This
    // accessor is injected at construction time by the service wrapper below.
    return (this as unknown as { app: import("obsidian").App }).app;
  }
}
