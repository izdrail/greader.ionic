import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { ArticleListMode, FeedSortMode } from '../domain/list-preferences';

const LIST_MODE_KEY = 'articleListMode';
const FEED_SORT_KEY = 'feedSortMode';

@Injectable({ providedIn: 'root' })
export class ListPreferencesService {
  readonly listMode = signal<ArticleListMode>('list');
  readonly feedSort = signal<FeedSortMode>('custom');

  async init(): Promise<void> {
    const [{ value: mode }, { value: sort }] = await Promise.all([
      Preferences.get({ key: LIST_MODE_KEY }),
      Preferences.get({ key: FEED_SORT_KEY }),
    ]);
    if (mode === 'list' || mode === 'grid' || mode === 'card') this.listMode.set(mode);
    if (sort === 'custom' || sort === 'alphabetical' || sort === 'unread' || sort === 'newest') this.feedSort.set(sort);
  }

  async setListMode(mode: ArticleListMode): Promise<void> {
    this.listMode.set(mode);
    await Preferences.set({ key: LIST_MODE_KEY, value: mode });
  }

  async setFeedSort(mode: FeedSortMode): Promise<void> {
    this.feedSort.set(mode);
    await Preferences.set({ key: FEED_SORT_KEY, value: mode });
  }
}
