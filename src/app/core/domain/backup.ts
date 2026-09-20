/** Settings backup document: every persisted preference key, versioned for forward compatibility. */
export const BACKUP_KEYS = [
  'theme', 'autoDark', 'appSettings', 'articleListMode', 'feedSortMode',
  'articleFontScale', 'articleInvert', 'articleImageFit', 'ttsPrefs', 'podcastRate',
] as const;

export const BACKUP_VERSION = 1;

export interface BackupDocument { version: number; exportedAt: number; settings: Record<string, string>; }

/** Serialize stored key/value pairs into a backup document, skipping keys with no stored value. */
export function buildBackup(values: Record<string, string | null>, now: number): string {
  const settings: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const value = values[key];
    if (value !== null && value !== undefined) settings[key] = value;
  }
  return JSON.stringify({ version: BACKUP_VERSION, exportedAt: now, settings } satisfies BackupDocument, null, 2);
}

/** Parse and validate a backup document. Unknown keys are dropped; a wrong version or shape throws. */
export function parseBackup(json: string): Record<string, string> {
  let doc: unknown;
  try { doc = JSON.parse(json); } catch { throw new Error('This file is not valid JSON'); }
  if (typeof doc !== 'object' || doc === null) throw new Error('This file is not a gReader backup');
  const { version, settings } = doc as Partial<BackupDocument>;
  if (version !== BACKUP_VERSION) throw new Error(`Unsupported backup version: ${String(version)}`);
  if (typeof settings !== 'object' || settings === null) throw new Error('This backup has no settings');
  const known = new Set<string>(BACKUP_KEYS);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (known.has(key) && typeof value === 'string') out[key] = value;
  }
  return out;
}
