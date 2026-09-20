import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { BACKUP_KEYS, buildBackup, parseBackup } from '../domain/backup';

/** Export and restore every persisted preference as a versioned JSON document. */
@Injectable({ providedIn: 'root' })
export class BackupService {
  readonly filename = 'greader-settings-backup.json';

  async export(): Promise<'shared' | 'downloaded'> {
    const values: Record<string, string | null> = {};
    await Promise.all(BACKUP_KEYS.map(async key => { values[key] = (await Preferences.get({ key })).value; }));
    const json = buildBackup(values, Date.now());
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({ path: this.filename, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: 'Export settings', url: file.uri });
      return 'shared';
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  /** Restore a backup document. Returns the keys that were applied. */
  async restore(json: string): Promise<string[]> {
    const settings = parseBackup(json);
    const keys = Object.keys(settings);
    if (!keys.length) throw new Error('This backup contains no known settings');
    await Promise.all(keys.map(key => Preferences.set({ key, value: settings[key] })));
    return keys;
  }
}
