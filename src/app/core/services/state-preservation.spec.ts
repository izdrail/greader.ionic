import { describe, expect, it } from 'vitest';
import { LocalFeedService } from './local-feed.service';
import { LocalProvider } from '../providers/local.provider';
import { Article, Subscription } from '../domain/models';
import { mergeArticlePages, stableId } from '../domain/feed-refresh';

/** Minimal in-memory StoragePort: enough surface for subscribe/import and local sync. */
function memoryStorage() {
  const subs = new Map<string, Subscription>();
  const articles = new Map<string, Article>();
  return {
    subs, articles,
    listSubscriptions: async (a: string) => [...subs.values()].filter(s => s.accountId === a),
    putSubscriptions: async (v: Subscription[]) => { for (const s of v) subs.set(s.id, s); },
    // Mirrors the real storage cap: listArticles only ever returns the newest 500.
    listArticles: async (a: string) => [...articles.values()].filter(x => x.accountId === a).sort((x, y) => y.publishedAt - x.publishedAt).slice(0, 500),
    putArticles: async (v: Article[]) => { for (const x of v) articles.set(x.id, x); },
    existingArticleIds: async (ids: string[]) => new Set(ids.filter(id => articles.has(id))),
  } as any;
}

const feed = (uids: string[], title = 'Example Blog') => ({
  parse: () => ({ title, link: 'https://example.com', items: uids.map((uid, i) => ({ uid, title: uid, link: `https://example.com/${uid}`, publishedAt: 1000 - i })) }),
}) as any;
const http = { get: async () => ({ status: 200, body: '<rss/>' }) } as any;
const FEED = 'https://example.com/feed';

describe('read/starred state survives refresh and re-import', () => {
  it('re-adding a feed keeps read, starred and feed settings, and only adds new items', async () => {
    const storage = memoryStorage();
    const first = await new LocalFeedService(feed(['a', 'b']), storage, http).importXml('acc', '', FEED);
    const a = stableId('acc', 'a');
    storage.articles.set(a, { ...storage.articles.get(a), read: true, starred: true });
    storage.subs.set(first.id, { ...first, notification: true, folderId: 'tech' } as Subscription);

    const again = await new LocalFeedService(feed(['c', 'a', 'b']), storage, http).importXml('acc', '', FEED);

    expect(storage.articles.get(a)).toMatchObject({ read: true, starred: true });
    expect(storage.articles.has(stableId('acc', 'c'))).toBe(true);
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ notification: true, folderId: 'tech', sort: first.sort });
    expect(again.unreadCount).toBe(first.unreadCount + 1);
  });

  it('a new subscription counts its items as unread', async () => {
    const sub = await new LocalFeedService(feed(['a', 'b', 'b']), memoryStorage(), http).importXml('acc', '', FEED);
    expect(sub.unreadCount).toBe(2);
  });

  it('sync does not return items already stored beyond the newest-500 page', async () => {
    const storage = memoryStorage();
    storage.subs.set('s1', { id: 's1', accountId: 'acc', feedUrl: FEED, syncExcluded: false } as Subscription);
    // 600 newer articles from other feeds push the old item out of listArticles' 500 page.
    for (let i = 0; i < 600; i++) storage.articles.set(`n${i}`, { id: `n${i}`, accountId: 'acc', subscriptionId: 's2', uid: `n${i}`, publishedAt: 10_000 + i } as Article);
    const old = stableId('acc', 'old');
    storage.articles.set(old, { id: old, accountId: 'acc', subscriptionId: 's1', uid: 'old', publishedAt: 1, read: true, starred: true } as Article);

    const provider = new LocalProvider(feed(['fresh', 'old']), storage, http);
    const snapshot = await provider.sync({ id: 'acc', provider: 'local', label: 'Local', createdAt: 0 });

    expect(snapshot.articles.map(x => x.uid)).toEqual(['fresh']);
  });

  it('mergeArticlePages unions pages by id, newest first', () => {
    const art = (id: string, publishedAt: number) => ({ id, publishedAt }) as Article;
    expect(mergeArticlePages([art('a', 3), art('b', 2)], [art('b', 2)], [art('z', 1), art('y', 5)]).map(x => x.id)).toEqual(['y', 'a', 'b', 'z']);
  });
});

describe('OPML import', () => {
  it('files feeds into folders from the OPML, reusing an existing folder by name, and reports progress', async () => {
    const storage = memoryStorage();
    const tags: any[] = [{ id: 'existing', accountId: 'acc', type: 'folder', label: 'Tech', sort: 3 }];
    storage.listTags = async () => tags;
    storage.putTags = async (v: any[]) => { tags.push(...v); };
    const parser = { parse: (xml: string) => ({ title: xml, link: undefined, items: [] }) } as any;
    const httpByUrl = { get: async (url: string) => (url.includes('bad') ? { status: 404, body: '' } : { status: 200, body: url }) } as any;
    const progress: string[] = [];
    const opml = `<opml><body><outline text="tech"><outline xmlUrl="https://a.test/feed"/></outline><outline text="News"><outline xmlUrl="https://b.test/feed"/><outline xmlUrl="https://bad.test/feed"/></outline><outline xmlUrl="https://c.test/feed"/></body></opml>`;

    const result = await new LocalFeedService(parser, storage, httpByUrl).importOpml('acc', opml, (d, t) => progress.push(`${d}/${t}`));

    expect(result).toEqual({ imported: 3, failed: ['https://bad.test/feed'] });
    const byUrl = new Map([...storage.subs.values()].map((s: Subscription) => [s.feedUrl, s.folderId]));
    expect(byUrl.get('https://a.test/feed')).toBe('existing');
    const news = tags.find(t => t.label === 'News');
    expect(news).toBeTruthy();
    expect(byUrl.get('https://b.test/feed')).toBe(news.id);
    expect(byUrl.get('https://c.test/feed')).toBeUndefined();
    expect(progress[0]).toBe('0/4');
    expect(progress.at(-1)).toBe('4/4');
  });
});
