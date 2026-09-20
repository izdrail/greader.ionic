import { Subscription } from './models';

/**
 * Where the subscribe flow lands after a feed import: straight onto the article
 * list filtered to the new feed when the import produced articles, otherwise it
 * stays put so the "added, but empty" message can be read.
 */
export function postSubscribeOpensArticleList(subscription: Subscription): boolean {
  return subscription.unreadCount > 0;
}

export function articleListQueryParams(subscription: Subscription): { sub?: string } {
  return postSubscribeOpensArticleList(subscription) ? { sub: subscription.id } : {};
}
