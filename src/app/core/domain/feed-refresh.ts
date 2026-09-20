import { Article, ParsedFeedItem, Subscription } from './models';

/** Items from a refreshed feed that are not already stored, matched by item uid. */
export function newItems(existingUids: ReadonlySet<string>, items: ParsedFeedItem[]): ParsedFeedItem[] {
  return items.filter(item => !existingUids.has(item.uid));
}

export interface FeedAlert { subscriptionId: string; title: string; count: number; }

/**
 * Per-feed new-article alerts: one entry per subscription that has "notify on
 * new articles" enabled and received at least one new article in this sync.
 */
export function feedAlerts(articles: Pick<Article, 'subscriptionId'>[], subscriptions: Pick<Subscription, 'id' | 'title' | 'notification'>[]): FeedAlert[] {
  const counts = new Map<string, number>();
  for (const article of articles) counts.set(article.subscriptionId, (counts.get(article.subscriptionId) ?? 0) + 1);
  return subscriptions
    .filter(sub => sub.notification && counts.has(sub.id))
    .map(sub => ({ subscriptionId: sub.id, title: sub.title, count: counts.get(sub.id)! }));
}

export function stableId(scope: string, value: string): string {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${scope}:${(hash >>> 0).toString(36)}`;
}
