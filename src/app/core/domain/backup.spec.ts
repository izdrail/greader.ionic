import { BACKUP_KEYS, buildBackup, parseBackup } from './backup';

describe('buildBackup + parseBackup round trip', () => {
  it('exports only stored keys and restores them', () => {
    const json = buildBackup({ theme: 'dark', autoDark: null, appSettings: '{"syncOnStartup":false}' }, 1000);
    const doc = JSON.parse(json);
    expect(doc.version).toBe(1);
    expect(doc.exportedAt).toBe(1000);
    expect(Object.keys(doc.settings)).toEqual(['theme', 'appSettings']);
    expect(parseBackup(json)).toEqual({ theme: 'dark', appSettings: '{"syncOnStartup":false}' });
  });

  it('covers every persisted preference key', () => {
    const all = Object.fromEntries(BACKUP_KEYS.map(k => [k, 'x']));
    expect(Object.keys(parseBackup(buildBackup(all, 0)))).toEqual([...BACKUP_KEYS]);
  });
});

describe('parseBackup', () => {
  it('rejects invalid input with a readable message', () => {
    expect(() => parseBackup('nope')).toThrow('not valid JSON');
    expect(() => parseBackup('42')).toThrow('not a gReader News backup');
    expect(() => parseBackup('{"version":99,"settings":{}}')).toThrow('Unsupported backup version');
    expect(() => parseBackup('{"version":1}')).toThrow('no settings');
  });

  it('drops unknown keys and non-string values', () => {
    const out = parseBackup(JSON.stringify({ version: 1, settings: { theme: 'sepia', evil: 'x', autoDark: 5 } }));
    expect(out).toEqual({ theme: 'sepia' });
  });
});
