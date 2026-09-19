import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ native: true, get: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.native },
  CapacitorHttp: { get: mocks.get },
}));

import { FeedHttpService } from './feed-http.service';

describe('FeedHttpService', () => {
  beforeEach(() => { mocks.native = true; mocks.get.mockReset(); });
  it('uses native HTTP inside a Capacitor app so feed CORS headers are irrelevant', async () => {
    mocks.get.mockResolvedValue({ status: 200, data: '<rss/>', headers: {}, url: 'https://example.test/feed' });
    await expect(new FeedHttpService().get('https://example.test/feed')).resolves.toEqual({ status: 200, body: '<rss/>' });
    expect(mocks.get).toHaveBeenCalledWith(expect.objectContaining({ responseType: 'text' }));
  });
  it('explains the browser-only CORS restriction', async () => {
    mocks.native = false;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(new FeedHttpService().get('https://example.test/feed')).rejects.toThrow('CORS');
    vi.unstubAllGlobals();
  });
});
