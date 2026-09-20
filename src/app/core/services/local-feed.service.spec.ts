import { LocalFeedService } from './local-feed.service';
import { parserStub } from './local-feed.test-utils';

describe('LocalFeedService', () => {
  it('says no feed was found when a page advertises none and common paths fail', async () => {
    const storage = { putSubscriptions: async () => undefined, putArticles: async () => undefined } as any;
    const http = { get: async () => ({ status: 200, body: '<html>not a feed</html>' }) } as any;
    const service = new LocalFeedService(parserStub(/./), storage, http);
    await expect(service.subscribe('local', 'https://example.com')).rejects.toThrow('No feed found on that page');
  });
});
