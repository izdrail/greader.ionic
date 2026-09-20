import { LocalFeedService } from './local-feed.service';
import { parserStub } from './local-feed.test-utils';

describe('LocalFeedService discovery', () => {
  it('discovers the advertised feed when given a plain website URL', async () => {
    const storage = { putSubscriptions: async () => undefined, putArticles: async () => undefined } as any;
    const page = '<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head></html>';
    const http = { get: async (url: string) => url.endsWith('/feed.xml') ? { status: 200, body: '<rss>real feed</rss>' } : { status: 200, body: page } } as any;
    const service = new LocalFeedService(parserStub(/<html/), storage, http);
    const sub = await service.subscribe('local', 'https://example.com/blog');
    expect(sub.title).toBe('Example Blog');
    expect(sub.feedUrl).toBe('https://example.com/feed.xml');
  });
});
