import { MARK_READ_AGES, markReadCutoff, reorderedWithSort, sortSubscriptions } from './list-preferences';
import { Subscription } from './models';

function sub(partial: Partial<Subscription> & { id: string }): Subscription {
  return {
    accountId: 'a', uid: partial.id, title: partial.id, sort: 0, unreadCount: 0, newestItemAt: 0,
    syncExcluded: false, hidden: false, notification: false, imageFit: true, javascript: true,
    offlineContent: -1, displayContent: -1, linkFormat: -1, autoReadability: -1, userAgent: -1,
    ...partial,
  };
}

describe('sortSubscriptions', () => {
  const subs = [
    sub({ id: 'beta', title: 'Beta', sort: 1, unreadCount: 2, newestItemAt: 100 }),
    sub({ id: 'alpha', title: 'alpha', sort: 0, unreadCount: 5, newestItemAt: 50 }),
    sub({ id: 'Gamma', title: 'Gamma', sort: 2, unreadCount: 0, newestItemAt: 200 }),
  ];

  it('sorts custom order by stored sort value', () => {
    expect(sortSubscriptions(subs, 'custom').map(x => x.id)).toEqual(['alpha', 'beta', 'Gamma']);
  });

  it('sorts alphabetically case-insensitively', () => {
    expect(sortSubscriptions(subs, 'alphabetical').map(x => x.id)).toEqual(['alpha', 'beta', 'Gamma']);
  });

  it('sorts by unread count descending', () => {
    expect(sortSubscriptions(subs, 'unread').map(x => x.id)).toEqual(['alpha', 'beta', 'Gamma']);
    expect(sortSubscriptions([subs[0], subs[2], subs[1]], 'unread').map(x => x.id)).toEqual(['alpha', 'beta', 'Gamma']);
  });

  it('sorts by newest article descending', () => {
    expect(sortSubscriptions(subs, 'newest').map(x => x.id)).toEqual(['Gamma', 'beta', 'alpha']);
  });

  it('does not mutate the input', () => {
    const before = subs.map(x => x.id);
    sortSubscriptions(subs, 'alphabetical');
    expect(subs.map(x => x.id)).toEqual(before);
  });
});

describe('markReadCutoff', () => {
  it('returns undefined for all articles', () => {
    expect(markReadCutoff('all', 1_000_000)).toBeUndefined();
  });

  it('subtracts the age window from now', () => {
    const now = 10_000_000_000;
    expect(markReadCutoff('week', now)).toBe(now - 604_800_000);
    expect(markReadCutoff('month', now)).toBe(now - 2_592_000_000);
  });

  it('rejects unknown ages and covers every declared option', () => {
    for (const age of MARK_READ_AGES) expect(() => markReadCutoff(age.id, 0)).not.toThrow();
    expect(() => markReadCutoff('year', 0)).toThrow('Unknown mark-read age');
  });
});

describe('reorderedWithSort', () => {
  const subs = ['a', 'b', 'c', 'd'].map((id, sort) => sub({ id, sort }));

  it('moves an item and reassigns contiguous sort values', () => {
    const result = reorderedWithSort(subs, 0, 2);
    expect(result.map(x => x.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(result.map(x => x.sort)).toEqual([0, 1, 2, 3]);
  });

  it('moves an item backwards', () => {
    expect(reorderedWithSort(subs, 3, 1).map(x => x.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns the input unchanged for a no-op move', () => {
    expect(reorderedWithSort(subs, 1, 1)).toBe(subs);
  });

  it('operates on the current custom order, not the input order', () => {
    const shuffled = [subs[2], subs[0], subs[1], subs[3]];
    expect(reorderedWithSort(shuffled, 0, 1).map(x => x.id)).toEqual(['b', 'a', 'c', 'd']);
  });
});
