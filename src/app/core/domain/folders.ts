import { Subscription, Tag } from './models';
import { FeedSortMode, sortSubscriptions } from './list-preferences';

export interface FolderGroup { folder: Tag; subscriptions: Subscription[]; unreadCount: number; }

let counter = 0;
/** Stable-ish unique id for a locally created folder tag. */
export function newFolderId(accountId: string, label: string, now: number): string {
  return `${accountId}:folder:${now.toString(36)}:${(counter++).toString(36)}:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`;
}

export function createFolder(accountId: string, label: string, sort: number, now = Date.now()): Tag {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Folder name is required');
  return { id: newFolderId(accountId, trimmed, now), accountId, uid: `user/-/label/${trimmed}`, type: 'folder', label: trimmed, sort, unreadCount: 0, syncExcluded: false, hidden: false };
}

/** Group subscriptions under their folders (sorted by folder sort) with an unfiled group last. */
export function groupByFolder(subscriptions: Subscription[], folders: Tag[], mode: FeedSortMode): { groups: FolderGroup[]; unfiled: Subscription[] } {
  const byId = new Map(folders.map(f => [f.id, f]));
  const groups = new Map<string, Subscription[]>();
  const unfiled: Subscription[] = [];
  for (const sub of subscriptions) {
    if (sub.folderId && byId.has(sub.folderId)) {
      const list = groups.get(sub.folderId) ?? [];
      list.push(sub);
      groups.set(sub.folderId, list);
    } else {
      unfiled.push(sub);
    }
  }
  const sortedFolders = [...folders].sort((a, b) => a.sort - b.sort);
  return {
    groups: sortedFolders
      .map(folder => {
        const subs = sortSubscriptions(groups.get(folder.id) ?? [], mode);
        return { folder, subscriptions: subs, unreadCount: subs.reduce((n, s) => n + s.unreadCount, 0) };
      })
      .filter(g => g.subscriptions.length > 0),
    unfiled: sortSubscriptions(unfiled, mode),
  };
}

/** Deleting a folder unfiles its subscriptions rather than deleting them. */
export function unfileSubscriptions(subscriptions: Subscription[], folderId: string): Subscription[] {
  return subscriptions.map(s => (s.folderId === folderId ? { ...s, folderId: undefined } : s));
}
