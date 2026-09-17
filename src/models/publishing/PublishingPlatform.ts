export const PUBLISHING_STATES = [
  "planned",
  "scheduled",
  "posted",
  "failed",
  "skipped"
] as const;

export type PublishingState = (typeof PUBLISHING_STATES)[number];

export type PublishingPlatformId = "tiktok" | "youtube" | "instagram";

export interface PublishingPlatformDefinition {
  id: PublishingPlatformId;
  name: string;
  abbreviation: string;
}

export interface PublishingPropertyKeys {
  state: string;
  scheduled: string;
  posted: string;
}

export const PUBLISHING_PLATFORMS: readonly PublishingPlatformDefinition[] = [
  { id: "tiktok", name: "TikTok", abbreviation: "TT" },
  { id: "youtube", name: "YouTube", abbreviation: "YT" },
  { id: "instagram", name: "Instagram", abbreviation: "IG" }
];

export function getPublishingPlatform(
  id: string | undefined
): PublishingPlatformDefinition | undefined {
  if (!id) return undefined;
  return PUBLISHING_PLATFORMS.find((platform) => platform.id === id);
}

export function getPublishingPropertyKeys(
  platform: PublishingPlatformDefinition
): PublishingPropertyKeys {
  return {
    state: `${platform.id}_state`,
    scheduled: `${platform.id}_scheduled`,
    posted: `${platform.id}_posted`
  };
}

export function normalizePublishingState(value: unknown): PublishingState | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return PUBLISHING_STATES.includes(normalized as PublishingState)
    ? normalized as PublishingState
    : undefined;
}

export function hasPublishingStateValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  return typeof value !== "string" || value.trim().length > 0;
}

export function publishingStateLabel(state: PublishingState): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function publishingStateSymbol(state: PublishingState | undefined): string {
  switch (state) {
    case "planned": return "·";
    case "scheduled": return "◷";
    case "posted": return "✓";
    case "failed": return "!";
    case "skipped": return "—";
    default: return "?";
  }
}
