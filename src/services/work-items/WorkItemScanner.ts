import type { App, TFile } from "obsidian";
import type { WorkItem } from "../../models/work-item/WorkItem";
import type {
  IgnoredWorkItemParseResult,
  InvalidWorkItemParseResult,
  WorkItemParseResult
} from "./WorkItemParseResult";
import { WorkItemParser, type WorkItemFrontmatter } from "./WorkItemParser";

export interface WorkItemScanResult {
  scannedAt: number;
  markdownFileCount: number;
  items: WorkItem[];
  invalid: InvalidWorkItemParseResult[];
  ignored: IgnoredWorkItemParseResult[];
}

export class WorkItemScanner {
  constructor(
    private readonly app: App,
    private readonly parser: WorkItemParser
  ) {}

  scanVault(): WorkItemScanResult {
    const files = this.app.vault.getMarkdownFiles();
    const items: WorkItem[] = [];
    const invalid: InvalidWorkItemParseResult[] = [];
    const ignored: IgnoredWorkItemParseResult[] = [];

    for (const file of files) {
      const result = this.scanFile(file);

      if (result.kind === "valid") {
        items.push(result.item);
      } else if (result.kind === "invalid") {
        invalid.push(result);
      } else {
        ignored.push(result);
      }
    }

    return {
      scannedAt: Date.now(),
      markdownFileCount: files.length,
      items,
      invalid,
      ignored
    };
  }

  scanFile(file: TFile): WorkItemParseResult {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter as WorkItemFrontmatter | undefined;
    return this.parser.parse(file, frontmatter);
  }
}
