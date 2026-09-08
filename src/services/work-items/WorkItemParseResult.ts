import type { WorkItem } from "../../models/work-item/WorkItem";
import type { WorkItemPropertyKey } from "../../models/work-item/WorkItemProperties";

export type WorkItemValidationSeverity = "warning" | "error";

export type WorkItemValidationCode =
  | "missing-required-property"
  | "invalid-type"
  | "invalid-status"
  | "status-not-allowed"
  | "invalid-priority"
  | "invalid-date"
  | "invalid-duration"
  | "invalid-reference"
  | "invalid-reference-list";

export interface WorkItemValidationIssue {
  severity: WorkItemValidationSeverity;
  code: WorkItemValidationCode;
  message: string;
  property?: WorkItemPropertyKey;
  value?: unknown;
}

export interface IgnoredWorkItemParseResult {
  kind: "ignored";
  path: string;
  reason: "missing-type";
}

export interface ValidWorkItemParseResult {
  kind: "valid";
  item: WorkItem;
  issues: WorkItemValidationIssue[];
}

export interface InvalidWorkItemParseResult {
  kind: "invalid";
  path: string;
  title: string;
  issues: WorkItemValidationIssue[];
}

export type WorkItemParseResult =
  | IgnoredWorkItemParseResult
  | ValidWorkItemParseResult
  | InvalidWorkItemParseResult;

export function hasValidationErrors(issues: readonly WorkItemValidationIssue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}
