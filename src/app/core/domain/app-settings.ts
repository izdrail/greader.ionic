export interface AppSettings {
  syncOnStartup: boolean;
  syncIntervalHours: 1 | 4 | 12 | 24;
  cacheImages: boolean;
  downloadPodcasts: boolean;
  markReadOnScroll: boolean;
  showArticleControls: boolean;
  autoloadReading: boolean;
  notifyAfterSync: boolean;
  vibrate: boolean;
  /** Show the on-device "Summarise with AI" action on articles. */
  aiSummaries: boolean;
  locale: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  syncOnStartup: true,
  syncIntervalHours: 4,
  cacheImages: true,
  downloadPodcasts: false,
  markReadOnScroll: true,
  showArticleControls: true,
  autoloadReading: false,
  notifyAfterSync: true,
  vibrate: false,
  aiSummaries: true,
  locale: 'system',
};

export const LOCALE_OPTIONS: { value: string; label: string }[] = [
  { value: 'system', label: 'System default' },
  { value: 'en', label: 'English' },
];

export const SYNC_INTERVAL_OPTIONS: { value: AppSettings['syncIntervalHours']; label: string }[] = [
  { value: 1, label: 'Hourly' },
  { value: 4, label: 'Every 4 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
];

const TOGGLES = ['syncOnStartup', 'cacheImages', 'downloadPodcasts', 'markReadOnScroll', 'showArticleControls', 'autoloadReading', 'notifyAfterSync', 'vibrate', 'aiSummaries'] as const;

/** Merge stored JSON over defaults, dropping unknown keys and wrong types. */
export function sanitizeSettings(raw: string | null | undefined): AppSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ...DEFAULT_SETTINGS }; }
  if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS };
  const input = parsed as Record<string, unknown>;
  const out = { ...DEFAULT_SETTINGS };
  for (const key of TOGGLES) if (typeof input[key] === 'boolean') out[key] = input[key] as boolean;
  const interval = input['syncIntervalHours'];
  if (interval === 1 || interval === 4 || interval === 12 || interval === 24) out.syncIntervalHours = interval;
  const locale = input['locale'];
  if (typeof locale === 'string' && /^(system|[a-z]{2}(-[a-zA-Z]{2})?)$/.test(locale)) out.locale = locale;
  return out;
}

/** A sync is due when the account has never synced or the interval has elapsed. */
export function isSyncDue(lastSyncAt: number | undefined, intervalHours: number, now: number): boolean {
  if (lastSyncAt === undefined) return true;
  return now - lastSyncAt >= intervalHours * 3_600_000;
}

/** Count articles published after the previous sync - the "new articles" figure for notifications. */
export function countNewArticles(publishedAts: number[], previousSyncAt: number | undefined): number {
  if (previousSyncAt === undefined) return publishedAts.length;
  return publishedAts.filter(ts => ts > previousSyncAt).length;
}
