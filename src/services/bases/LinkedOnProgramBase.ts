import { TFile, type App } from "obsidian";

export function listOnProgramBases(app: App): TFile[] {
  return app.vault
    .getFiles()
    .filter((file) => isOnProgramBaseFile(file))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function isOnProgramBaseFile(file: TFile): boolean {
  return file.extension === "base" && file.name.toLowerCase().endsWith(".onprogram.base");
}

export function resolveLinkedOnProgramBase(
  app: App,
  reference: string | undefined
): TFile | undefined {
  if (!reference?.trim()) return undefined;

  const raw = unwrapReference(reference);
  const candidates = [raw];
  if (!raw.toLowerCase().endsWith(".base")) candidates.push(`${raw}.base`);

  for (const candidate of candidates) {
    const exact = app.vault.getAbstractFileByPath(candidate);
    if (exact instanceof TFile && isOnProgramBaseFile(exact)) return exact;
  }

  const normalized = raw.toLowerCase();
  const normalizedWithBase = normalized.endsWith(".base") ? normalized : `${normalized}.base`;
  return listOnProgramBases(app).find((file) =>
    file.path.toLowerCase() === normalizedWithBase ||
    file.name.toLowerCase() === normalizedWithBase ||
    file.basename.toLowerCase() === normalized
  );
}

function unwrapReference(value: string): string {
  let result = value.trim();
  if (result.startsWith("[[") && result.endsWith("]]")) {
    result = result.slice(2, -2);
  }

  const aliasIndex = result.indexOf("|");
  if (aliasIndex >= 0) result = result.slice(0, aliasIndex);

  const headingIndex = result.indexOf("#");
  if (headingIndex >= 0) result = result.slice(0, headingIndex);

  return result.trim().replace(/^\/+/, "");
}
