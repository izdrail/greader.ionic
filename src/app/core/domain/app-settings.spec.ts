import { countNewArticles, DEFAULT_SETTINGS, isSyncDue, sanitizeSettings } from './app-settings';

describe('sanitizeSettings', () => {
  it('returns defaults for missing or invalid input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('42')).toEqual(DEFAULT_SETTINGS);
  });

  it('merges valid values and drops wrong types', () => {
    const out = sanitizeSettings(JSON.stringify({ syncOnStartup: false, syncIntervalHours: 12, cacheImages: 'yes', syncIntervalHours2: 99 }));
    expect(out.syncOnStartup).toBe(false);
    expect(out.syncIntervalHours).toBe(12);
    expect(out.cacheImages).toBe(true);
  });

  it('rejects unknown interval values', () => {
    expect(sanitizeSettings(JSON.stringify({ syncIntervalHours: 6 })).syncIntervalHours).toBe(4);
    expect(sanitizeSettings(JSON.stringify({ syncIntervalHours: 24 })).syncIntervalHours).toBe(24);
  });
});

describe('isSyncDue', () => {
  it('is due when never synced', () => {
    expect(isSyncDue(undefined, 4, 1_000_000)).toBe(true);
  });

  it('is due exactly at the interval boundary', () => {
    const now = 10_000_000_000;
    expect(isSyncDue(now - 4 * 3_600_000, 4, now)).toBe(true);
    expect(isSyncDue(now - 4 * 3_600_000 + 1, 4, now)).toBe(false);
  });
});

describe('countNewArticles', () => {
  it('counts everything on the first sync', () => {
    expect(countNewArticles([1, 2, 3], undefined)).toBe(3);
  });

  it('counts only articles published after the previous sync', () => {
    expect(countNewArticles([100, 200, 300], 150)).toBe(2);
    expect(countNewArticles([100], 150)).toBe(0);
  });
});

describe('locale setting', () => {
  it('defaults to system and keeps a valid stored locale', () => {
    expect(sanitizeSettings(null).locale).toBe('system');
    expect(sanitizeSettings(JSON.stringify({ locale: 'en' })).locale).toBe('en');
  });

  it('drops malformed locales', () => {
    expect(sanitizeSettings(JSON.stringify({ locale: 'klingon!!' })).locale).toBe('system');
    expect(sanitizeSettings(JSON.stringify({ locale: 42 })).locale).toBe('system');
  });
});
