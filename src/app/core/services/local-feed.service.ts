import { Injectable } from '@angular/core';
import { Article, Subscription } from '../domain/models';
import { FeedParserService } from '../feeds/feed-parser.service';
import { StoragePort } from '../storage/storage.port';

@Injectable({ providedIn: 'root' })
export class LocalFeedService {
  constructor(private parser: FeedParserService, private storage: StoragePort) {}

  async subscribe(accountId: string, url: string): Promise<Subscription> {
    const normalized = this.normalizeUrl(url);
    const response = await fetch(normalized, { headers: { Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml' } });
    if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
    return this.importXml(accountId, await response.text(), normalized);
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
  private stableId(scope: string, value: string) { let hash = 2166136261; for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return `${scope}:${(hash >>> 0).toString(36)}`; }
}
