import { vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { store.set(key, value); },
  },
}));

import { ListPreferencesService } from './list-preferences.service';

describe('ListPreferencesService', () => {
  beforeEach(() => store.clear());

  it('defaults to list mode and custom feed order', async () => {
    const service = new ListPreferencesService();
    await service.init();
    expect(service.listMode()).toBe('list');
    expect(service.feedSort()).toBe('custom');
  });

  it('restores persisted preferences', async () => {
    store.set('articleListMode', 'grid');
    store.set('feedSortMode', 'unread');
    const service = new ListPreferencesService();
    await service.init();
    expect(service.listMode()).toBe('grid');
    expect(service.feedSort()).toBe('unread');
  });

  it('ignores values outside the known options', async () => {
    store.set('articleListMode', 'mosaic');
    store.set('feedSortMode', 'random');
    const service = new ListPreferencesService();
    await service.init();
    expect(service.listMode()).toBe('list');
    expect(service.feedSort()).toBe('custom');
  });

  it('persists changes immediately', async () => {
    const service = new ListPreferencesService();
    await service.setListMode('card');
    await service.setFeedSort('alphabetical');
    expect(store.get('articleListMode')).toBe('card');
    expect(store.get('feedSortMode')).toBe('alphabetical');
    const restored = new ListPreferencesService();
    await restored.init();
    expect(restored.listMode()).toBe('card');
    expect(restored.feedSort()).toBe('alphabetical');
  });
});
