import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { AppSettings, DEFAULT_SETTINGS, sanitizeSettings } from '../domain/app-settings';

const SETTINGS_KEY = 'appSettings';

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  readonly settings = signal<AppSettings>({ ...DEFAULT_SETTINGS });

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: SETTINGS_KEY });
    this.settings.set(sanitizeSettings(value));
  }

  async update(change: Partial<AppSettings>): Promise<void> {
    const next = { ...this.settings(), ...change };
    this.settings.set(next);
    await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(next) });
  }
}
