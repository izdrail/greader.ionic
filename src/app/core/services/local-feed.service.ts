import { Injectable } from '@angular/core';
import { Article, Subscription } from '../domain/models';
import { FeedParserService } from '../feeds/feed-parser.service';
import { StoragePort } from '../storage/storage.port';
import { FeedHttpService } from './feed-http.service';
import { stableId } from '../domain/feed-refresh';
import { discoverFeedLinks } from '../domain/feed-discovery';

@Injectable({ providedIn: 'root' })
export class LocalFeedService {
  constructor(private parser: FeedParserService, private storage: StoragePort, private http: FeedHttpService) {}

  async subscribe(accountId: string, url: string): Promise<Subscription> {
    const normalized = this.normalizeUrl(url);
    const response = await this.http.get(normalized);
    if (response.status < 200 || response.status >= 300) throw new Error(`Feed request failed (${response.status})`);
    try { return await this.importXml(accountId, response.body, normalized); }
    catch { /* not a feed document: try website feed discovery */ }
    return this.subscribeViaDiscovery(accountId, normalized, response.body);
  }

  /** The URL points at a web page: follow its advertised feed links, then common feed paths. */
  private async subscribeViaDiscovery(accountId: string, pageUrl: string, html: string): Promise<Subscription> {
    for (const link of discoverFeedLinks(html, pageUrl)) {
      try {
        const feed = await this.http.get(link.url);
        if (feed.status < 200 || feed.status >= 300) continue;
        return await this.importXml(accountId, feed.body, link.url);
      } catch { /* candidate was not a feed; keep looking */ }
    }
    throw new Error('No feed found on that page. Paste the direct feed URL instead.');
  }

  async importXml(accountId: string, xml: string, sourceUrl?: string): Promise<Subscription> {
    const parsed = this.parser.parse(xml);
    const id = this.stableId(accountId, sourceUrl || parsed.link || parsed.title);
    const subscription: Subscription = {
      id, accountId, uid: sourceUrl || parsed.link || id, title: parsed.title, feedUrl: sourceUrl, htmlUrl: parsed.link,
      iconUrl: parsed.image, sort: Date.now(), unreadCount: parsed.items.length, newestItemAt: Math.max(0, ...parsed.items.map(x => x.publishedAt)),
      syncExcluded: false, hidden: false, notification: false, imageFit: true, javascript: true,
      offlineContent: -1, displayContent: -1, linkFormat: -1, autoReadability: -1, userAgent: -1,
    };
    const articles: Article[] = parsed.items.map(item => ({
      id: this.stableId(accountId, item.uid), accountId, subscriptionId: id, uid: item.uid, title: item.title,
      content: item.content, author: item.author, link: item.link, image: item.image, audio: item.audio, video: item.video,
      publishedAt: item.publishedAt, updatedAt: item.publishedAt, starred: false, cached: true, read: false, keepUnread: false,
    }));
    await Promise.all([this.storage.putSubscriptions([subscription]), this.storage.putArticles(articles)]);
    return subscription;
  }

  async importOpml(accountId: string, xml: string): Promise<{ imported: number; failed: string[] }> {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const urls = [...doc.querySelectorAll('outline[xmlUrl]')].map(node => node.getAttribute('xmlUrl')).filter((x): x is string => !!x);
    const failed: string[] = []; let imported = 0;
    for (const url of urls) { try { await this.subscribe(accountId, url); imported++; } catch { failed.push(url); } }
    return { imported, failed };
  }

  private normalizeUrl(value: string) { const v = value.trim(); return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).toString(); }
  private stableId = stableId;
}
