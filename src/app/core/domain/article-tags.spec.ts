import { describe, expect, it } from 'vitest';
import { createArticleTag, normalizeTagLabel, reconcileArticleTags, toggleArticleTag } from './article-tags';
import { Article, Tag } from './models';

const account = 'acc-1';
const tag = (id: string, label: string, type: Tag['type'] = 'tag'): Tag => ({ id, accountId: account, uid: `user/-/label/${label}`, type, label, sort: 0, unreadCount: 0, syncExcluded: false, hidden: false });
const article = (tags?: string[]): Article => ({ id: 'a1', accountId: account, subscriptionId: 's1', uid: 'u1', title: 't', publishedAt: 1, updatedAt: 1, starred: false, cached: false, read: false, keepUnread: false, tags });

describe('article tags', () => {
  it('normalizes whitespace in labels', () => {
    expect(normalizeTagLabel('  read   later  ')).toBe('read later');
  });

  it('creates a tag with a stable label uid', () => {
    const created = createArticleTag(account, 'Read later', []);
    expect(created?.type).toBe('tag');
    expect(created?.uid).toBe('user/-/label/Read later');
  });

  it('rejects an empty label', () => {
    expect(createArticleTag(account, '   ', [])).toBeUndefined();
  });

  it('returns the existing tag on a case-insensitive duplicate instead of duplicating', () => {
    const existing = tag('t1', 'Read Later');
    const result = createArticleTag(account, 'read later', [existing]);
    expect(result?.id).toBe('t1');
  });

  it('ignores folder tags with the same label when deduplicating', () => {
    const folder = tag('f1', 'Tech', 'folder');
    const result = createArticleTag(account, 'Tech', [folder]);
    expect(result?.id).not.toBe('f1');
    expect(result?.type).toBe('tag');
  });

  it('toggles a tag on and off an article without mutating it', () => {
    const a = article(['t1']);
    expect(toggleArticleTag(a, 't2')).toEqual(['t1', 't2']);
    expect(toggleArticleTag(a, 't1')).toEqual([]);
    expect(a.tags).toEqual(['t1']);
  });

  it('reconciles checked tags plus a brand new label', () => {
    const { tagIds, created } = reconcileArticleTags(['t1'], 'Fresh', account, [tag('t1', 'One')], 42);
    expect(tagIds).toContain('t1');
    expect(created?.label).toBe('Fresh');
    expect(tagIds).toContain(created!.id);
  });

  it('reconcile reuses an existing label without reporting a creation', () => {
    const existing = tag('t1', 'Fresh');
    const { tagIds, created } = reconcileArticleTags([], 'fresh', account, [existing]);
    expect(created).toBeUndefined();
    expect(tagIds).toEqual(['t1']);
  });
});
