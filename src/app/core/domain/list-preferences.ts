import { Subscription } from './models';

export type ArticleListMode = 'list' | 'grid' | 'card';
export type FeedSortMode = 'custom' | 'alphabetical' | 'unread' | 'newest';

export const ARTICLE_LIST_MODES: { id: ArticleListMode; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'grid', label: 'Grid' },
  { id: 'card', label: 'Card' },
];

export const FEED_SORT_MODES: { id: FeedSortMode; label: string }[] = [
  { id: 'custom', label: 'Custom order' },
  { id: 'alphabetical', label: 'Alphabetical' },
  { id: 'unread', label: 'Unread count' },
  { id: 'newest', label: 'Newest article' },
];

export interface MarkReadAge { id: string; label: string; milliseconds: number | null; }

export const MARK_READ_AGES: MarkReadAge[] = [
  { id: 'all', label: 'All articles', milliseconds: null },
  { id: 'day', label: 'Older than a day', milliseconds: 86_400_000 },
  { id: '3days', label: 'Older than 3 days', milliseconds: 259_200_000 },
  { id: 'week', label: 'Older than a week', milliseconds: 604_800_000 },
  { id: '2weeks', label: 'Older than two weeks', milliseconds: 1_209_600_000 },
  { id: 'month', label: 'Older than a month', milliseconds: 2_592_000_000 },
];

/** Cutoff for an age option: articles published before it are marked read. `undefined` marks everything. */
export function markReadCutoff(ageId: string, now: number): number | undefined {
  const age = MARK_READ_AGES.find(x => x.id === ageId);
  if (!age) throw new Error(`Unknown mark-read age: ${ageId}`);
  return age.milliseconds === null ? undefined : now - age.milliseconds;
}

/** Sort subscriptions for drawer and management lists. `custom` keeps the user's drag order (`sort` asc). */
export function sortSubscriptions(subscriptions: Subscription[], mode: FeedSortMode): Subscription[] {
  const copy = [...subscriptions];
  switch (mode) {
    case 'alphabetical':
      return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    case 'unread':
      return copy.sort((a, b) => b.unreadCount - a.unreadCount || a.title.localeCompare(b.title));
    case 'newest':
      return copy.sort((a, b) => b.newestItemAt - a.newestItemAt);
    case 'custom':
      return copy.sort((a, b) => a.sort - b.sort);
  }
}

/** Move the item at `from` to `to` and reassign contiguous `sort` values for persistence. */
export function reorderedWithSort(subscriptions: Subscription[], from: number, to: number): Subscription[] {
  if (from === to) return subscriptions;
  const copy = sortSubscriptions(subscriptions, 'custom');
  const [moved] = copy.splice(from, 1);
  if (!moved) return subscriptions;
  copy.splice(to, 0, moved);
  return copy.map((sub, index) => ({ ...sub, sort: index }));
}
