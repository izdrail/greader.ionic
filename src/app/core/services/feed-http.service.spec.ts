import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedHttpService } from './feed-http.service';

const mocks = { native: true, get: vi.fn() };
function service(): FeedHttpService {
  const s = new FeedHttpService();
  s.native = { isNative: () => mocks.native, get: mocks.get };
  return s;
}

describe('FeedHttpService', () => {
  beforeEach(() => { mocks.native = true; mocks.get.mockReset(); });
  it('uses native HTTP inside a Capacitor app so feed CORS headers are irrelevant', async () => {
    mocks.get.mockResolvedValue({ status: 200, data: '<rss/>', headers: {}, url: 'https://example.test/feed' });
    await expect(service().get('https://example.test/feed')).resolves.toEqual({ status: 200, body: '<rss/>' });
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'text' }));
  });
  it('routes browser feeds through the first-party proxy', async () => {
    mocks.native = false;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<rss/>', { status: 200 })));
    await expect(service().get('https://example.test/feed')).resolves.toEqual({ status: 200, body: '<rss/>' });
    const [proxyUrl, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(proxyUrl)).toContain('/api/feed?url=https%3A%2F%2Fexample.test%2Ffeed');
    expect(options).toEqual(expect.objectContaining({ credentials: 'same-origin' }));
    vi.unstubAllGlobals();
  });
});
