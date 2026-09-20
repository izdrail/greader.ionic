import { buildOpml, opmlDate } from './opml';
import { Subscription } from './models';

function sub(partial: Partial<Subscription>): Subscription {
  return {
    id: 's1', accountId: 'a', uid: 'u', title: 'Feed', sort: 0, unreadCount: 0, newestItemAt: 0,
    syncExcluded: false, hidden: false, notification: false, imageFit: true, javascript: true,
    offlineContent: -1, displayContent: -1, linkFormat: -1, autoReadability: -1, userAgent: -1,
    ...partial,
  };
}

describe('buildOpml', () => {
  it('exports rss outlines with feed and site URLs', () => {
    const xml = buildOpml([sub({ title: 'Example', feedUrl: 'https://example.com/feed.xml', htmlUrl: 'https://example.com/' })], 'My feeds', 0);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const outline = doc.querySelector('outline[xmlUrl]');
    expect(outline?.getAttribute('xmlUrl')).toBe('https://example.com/feed.xml');
    expect(outline?.getAttribute('htmlUrl')).toBe('https://example.com/');
    expect(outline?.getAttribute('text')).toBe('Example');
    expect(outline?.getAttribute('type')).toBe('rss');
    expect(doc.querySelector('title')?.textContent).toBe('My feeds');
  });

  it('escapes XML special characters in titles and URLs', () => {
    const xml = buildOpml([sub({ title: 'A & B "News"', feedUrl: 'https://example.com/f?a=1&b=2' })], 'T', 0);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    const outline = doc.querySelector('outline');
    expect(outline?.getAttribute('text')).toBe('A & B "News"');
    expect(outline?.getAttribute('xmlUrl')).toBe('https://example.com/f?a=1&b=2');
  });

  it('omits subscriptions without a feed URL', () => {
    const xml = buildOpml([sub({ title: 'No feed' }), sub({ title: 'Has feed', feedUrl: 'https://x.test/rss' })], 'T', 0);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    expect(doc.querySelectorAll('outline').length).toBe(1);
  });

  it('round-trips through the import outline shape', () => {
    const xml = buildOpml([
      sub({ title: 'One', feedUrl: 'https://one.test/feed' }),
      sub({ title: 'Two', feedUrl: 'https://two.test/feed' }),
    ], 'T', 0);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const urls = [...doc.querySelectorAll('outline[xmlUrl]')].map(n => n.getAttribute('xmlUrl'));
    expect(urls).toEqual(['https://one.test/feed', 'https://two.test/feed']);
  });
});

describe('opmlDate', () => {
  it('formats an RFC 822 GMT date', () => {
    expect(opmlDate(0)).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
  });
});
