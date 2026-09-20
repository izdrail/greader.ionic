import { FeedParserService } from '../feeds/feed-parser.service';
import { LocalFeedService } from './local-feed.service';

describe('LocalFeedService', () => {
  it('keeps the parser reason in subscription errors', async () => {
    const storage = { putSubscriptions: async () => undefined, putArticles: async () => undefined } as any;
    const http = { get: async () => ({ status: 200, body: '<html>not a feed</html>' }) } as any;
    const service = new LocalFeedService(new FeedParserService(), storage, http);
    await expect(service.subscribe('local', 'https://example.com')).rejects.toThrow('Could not parse feed: This URL returned a web page');
  });
});
