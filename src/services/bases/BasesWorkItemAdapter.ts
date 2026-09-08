import type { App, BasesEntry, BasesEntryGroup, BasesQueryResult } from "obsidian";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type { InvalidWorkItemParseResult } from "../work-items/WorkItemParseResult";
import type { WorkItemParser } from "../work-items/WorkItemParser";

export interface BasesWorkItemResult {
  items: WorkItem[];
  invalid: InvalidWorkItemParseResult[];
  ignoredPaths: string[];
}

export interface BasesWorkItemGroup {
  key: unknown;
  items: WorkItem[];
  invalid: InvalidWorkItemParseResult[];
  ignoredPaths: string[];
}

/**
 * Converts the files selected by an Obsidian Base query into OnProgram domain
 * objects. The Base remains responsible for filters, sorting, limits, formulas,
 * and grouping; this adapter only performs OnProgram schema normalization.
 */
export class BasesWorkItemAdapter {
  constructor(
    private readonly app: App,
    private readonly parser: WorkItemParser
  ) {}

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
    const invalid: InvalidWorkItemParseResult[] = [];
    const ignoredPaths: string[] = [];

    for (const entry of entries) {
      const cache = this.app.metadataCache.getFileCache(entry.file);
      const parsed = this.parser.parse(entry.file, cache?.frontmatter);

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
}
