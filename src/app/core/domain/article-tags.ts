import { Article, Tag } from './models';

let counter = 0;

export function normalizeTagLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** Returns the matching existing tag on a duplicate label, a fresh tag on success, undefined on an empty label. */
export function createArticleTag(accountId: string, label: string, existing: Tag[], now = Date.now()): Tag | undefined {
  const normalized = normalizeTagLabel(label);
  if (!normalized) return undefined;
  const duplicate = existing.find(t => t.type === 'tag' && t.label.toLowerCase() === normalized.toLowerCase());
  if (duplicate) return duplicate;
  counter += 1;
  return {
    id: `tag-${now}-${counter}`,
    accountId,
    uid: `user/-/label/${normalized}`,
    type: 'tag',
    label: normalized,
    sort: existing.length + 1,
    unreadCount: 0,
    syncExcluded: false,
    hidden: false,
  };
}

export function toggleArticleTag(article: Article, tagId: string): string[] {
  const tags = article.tags ?? [];
  return tags.includes(tagId) ? tags.filter(t => t !== tagId) : [...tags, tagId];
}

export function reconcileArticleTags(selectedIds: string[], newLabel: string, accountId: string, existing: Tag[], now = Date.now()): { tagIds: string[]; created?: Tag } {
  const created = newLabel ? createArticleTag(accountId, newLabel, existing, now) : undefined;
  const ids = new Set(selectedIds);
  if (created) ids.add(created.id);
  return { tagIds: [...ids], created: created && !existing.some(t => t.id === created.id) ? created : undefined };
}
