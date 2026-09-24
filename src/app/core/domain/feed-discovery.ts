export interface FeedLink { url: string; title?: string; }

const FEED_TYPES = ['application/rss+xml', 'application/atom+xml', 'application/feed+json', 'application/json'];

/**
 * Feed discovery for plain website URLs: pull the <link rel="alternate"> feed
 * pointers out of a page, resolved against the page's URL. Falls back to common
 * feed paths when the page advertises nothing.
 */
export function discoverFeedLinks(html: string, pageUrl: string): FeedLink[] {
  const found: FeedLink[] = [];
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    if (!/rel\s*=\s*["'][^"']*alternate/i.test(tag)) continue;
    const type = attr(tag, 'type')?.toLowerCase();
    if (!type || !FEED_TYPES.some(t => type.includes(t))) continue;
    const href = attr(tag, 'href');
    if (!href) continue;
    try {
      found.push({ url: new URL(href, pageUrl).toString(), title: attr(tag, 'title') });
    } catch { /* unresolvable href */ }
  }
  if (!found.length) {
    for (const candidate of ['/feed', '/feed/', '/rss', '/rss.xml', '/atom.xml', '/feed.xml', '/index.xml']) {
      try { found.push({ url: new URL(candidate, pageUrl).toString() }); } catch { /* bad base */ }
    }
  }
  return found;
}

function attr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')) ?? tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, 'i'));
  return match?.[1];
}

/** Loose feed-URL identity for duplicate checks: scheme, "www.", case and trailing slashes don't count. */
export function feedUrlKey(value: string | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}
