import { vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { store.set(key, value); },
  },
}));

import { AppSettingsService } from './app-settings.service';
import { DEFAULT_SETTINGS } from '../domain/app-settings';

describe('AppSettingsService', () => {
  beforeEach(() => store.clear());

  it('starts from defaults and persists updates', async () => {
    const service = new AppSettingsService();
    await service.init();
    expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    await service.update({ syncIntervalHours: 12, vibrate: true });
    expect(service.settings().syncIntervalHours).toBe(12);
    const restored = new AppSettingsService();
    await restored.init();
    expect(restored.settings().syncIntervalHours).toBe(12);
    expect(restored.settings().vibrate).toBe(true);
    expect(restored.settings().syncOnStartup).toBe(true);
  });
});
