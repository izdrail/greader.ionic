import { createFolder, groupByFolder, newFolderId, unfileSubscriptions } from './folders';
import { Subscription, Tag } from './models';

function sub(partial: Partial<Subscription> & { id: string }): Subscription {
  return {
    accountId: 'a', uid: partial.id, title: partial.id, sort: 0, unreadCount: 0, newestItemAt: 0,
    syncExcluded: false, hidden: false, notification: false, imageFit: true, javascript: true,
    offlineContent: -1, displayContent: -1, linkFormat: -1, autoReadability: -1, userAgent: -1,
    ...partial,
  };
}

describe('createFolder', () => {
  it('builds a folder tag with a gReader-style label uid', () => {
    const folder = createFolder('a', 'Tech News', 3, 1000);
    expect(folder.type).toBe('folder');
    expect(folder.label).toBe('Tech News');
    expect(folder.uid).toBe('user/-/label/Tech News');
    expect(folder.sort).toBe(3);
    expect(folder.accountId).toBe('a');
  });

  it('rejects blank names', () => {
    expect(() => createFolder('a', '   ', 0)).toThrow('Folder name is required');
  });

  it('generates distinct ids per call', () => {
    expect(newFolderId('a', 'x', 1000)).not.toBe(newFolderId('a', 'x', 1000));
  });
});

describe('groupByFolder', () => {
  const folders: Tag[] = [
    { id: 'f2', accountId: 'a', uid: 'u2', type: 'folder', label: 'Second', sort: 2, unreadCount: 0, syncExcluded: false, hidden: false },
    { id: 'f1', accountId: 'a', uid: 'u1', type: 'folder', label: 'First', sort: 1, unreadCount: 0, syncExcluded: false, hidden: false },
  ];
  const subs = [
    sub({ id: 's1', folderId: 'f1', unreadCount: 2 }),
    sub({ id: 's2', folderId: 'f2', unreadCount: 3 }),
    sub({ id: 's3', folderId: 'f1', unreadCount: 1 }),
    sub({ id: 's4' }),
    sub({ id: 's5', folderId: 'missing' }),
  ];

  it('groups by folder in folder sort order with unread sums', () => {
    const { groups } = groupByFolder(subs, folders, 'custom');
    expect(groups.map(g => g.folder.id)).toEqual(['f1', 'f2']);
    expect(groups[0].subscriptions.map(s => s.id)).toEqual(['s1', 's3']);
    expect(groups[0].unreadCount).toBe(3);
    expect(groups[1].unreadCount).toBe(3);
  });

  it('sends unfiled and dangling-folder subscriptions to the unfiled list', () => {
    const { unfiled } = groupByFolder(subs, folders, 'custom');
    expect(unfiled.map(s => s.id)).toEqual(['s4', 's5']);
  });

  it('applies the feed sort mode within each group', () => {
    const { groups } = groupByFolder(subs, folders, 'alphabetical');
    expect(groups[0].subscriptions.map(s => s.id)).toEqual(['s1', 's3']);
    const reversed = [subs[1], subs[0], subs[2], subs[3], subs[4]];
    const alpha = groupByFolder(reversed, folders, 'alphabetical');
    expect(alpha.groups[0].subscriptions.map(s => s.id)).toEqual(['s1', 's3']);
  });

  it('omits empty folders', () => {
    const { groups } = groupByFolder([sub({ id: 's9' })], folders, 'custom');
    expect(groups).toEqual([]);
  });
});

describe('unfileSubscriptions', () => {
  it('clears only the deleted folder assignment', () => {
    const result = unfileSubscriptions([sub({ id: 'a', folderId: 'f1' }), sub({ id: 'b', folderId: 'f2' })], 'f1');
    expect(result[0].folderId).toBeUndefined();
    expect(result[1].folderId).toBe('f2');
  });
});
