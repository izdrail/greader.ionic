import { describe, expect, it } from 'vitest';
import { feedAlerts, newItems, stableId } from './feed-refresh';

const item = (uid: string) => ({ uid, title: uid, publishedAt: 1 });

describe('feed refresh', () => {
  it('keeps only items whose uid is not stored', () => {
    expect(newItems(new Set(['a', 'b']), [item('a'), item('c')]).map(x => x.uid)).toEqual(['c']);
  });

  it('returns nothing when the feed has no fresh items', () => {
    expect(newItems(new Set(['a']), [item('a')])).toEqual([]);
  });

  it('stableId is deterministic and scoped', () => {
    expect(stableId('acc', 'uid-1')).toBe(stableId('acc', 'uid-1'));
    expect(stableId('acc', 'uid-1')).not.toBe(stableId('other', 'uid-1'));
  });

  it('alerts only for feeds with notifications on, with per-feed counts', () => {
    const articles = [{ subscriptionId: 's1' }, { subscriptionId: 's1' }, { subscriptionId: 's2' }];
    const subs = [
      { id: 's1', title: 'Noisy', notification: true },
      { id: 's2', title: 'Quiet', notification: false },
      { id: 's3', title: 'Empty', notification: true },
    ];
    expect(feedAlerts(articles, subs)).toEqual([{ subscriptionId: 's1', title: 'Noisy', count: 2 }]);
  });
});
