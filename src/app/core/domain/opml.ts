import { Subscription } from './models';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** RFC 822 date used by OPML dateCreated, e.g. "Sun, 20 Sep 2026 16:51:00 GMT". */
export function opmlDate(now: number): string {
  return new Date(now).toUTCString();
}

/** Build an OPML 1.0 subscription list in the shape gReader and other readers export/import. */
export function buildOpml(subscriptions: Subscription[], title: string, now: number): string {
  const outlines = subscriptions
    .filter(s => s.feedUrl)
    .map(s => `    <outline text="${escapeXml(s.title)}" title="${escapeXml(s.title)}" type="rss" xmlUrl="${escapeXml(s.feedUrl!)}"${s.htmlUrl ? ` htmlUrl="${escapeXml(s.htmlUrl)}"` : ''}/>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${opmlDate(now)}</dateCreated>
  </head>
  <body>
${outlines}
  </body>
</opml>
`;
}
