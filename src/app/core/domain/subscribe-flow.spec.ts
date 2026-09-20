import { describe, expect, it } from 'vitest';
import { articleListQueryParams, postSubscribeOpensArticleList } from './subscribe-flow';
import { Subscription } from './models';

const sub = (unreadCount: number): Subscription => ({
  id: 'sub-1', accountId: 'acc', uid: 'u', title: 'Feed', sort: 0, unreadCount, newestItemAt: 0,
  syncExcluded: false, hidden: false, notification: false, imageFit: true, javascript: true,
  offlineContent: -1, displayContent: -1, linkFormat: -1, autoReadability: -1, userAgent: -1,
});

describe('subscribe flow destination', () => {
  it('opens the article list when the import produced articles', () => {
    expect(postSubscribeOpensArticleList(sub(12))).toBe(true);
    expect(articleListQueryParams(sub(12))).toEqual({ sub: 'sub-1' });
  });

  it('stays put when the feed is empty', () => {
    expect(postSubscribeOpensArticleList(sub(0))).toBe(false);
    expect(articleListQueryParams(sub(0))).toEqual({});
  });
});
