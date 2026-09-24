import { Account, Article, PendingMutation, Subscription, Tag } from '../domain/models';
export abstract class StoragePort {
  abstract listAccounts(): Promise<Account[]>; abstract putAccount(value: Account): Promise<void>;
  abstract listSubscriptions(accountId: string): Promise<Subscription[]>; abstract putSubscriptions(values: Subscription[]): Promise<void>;
  abstract listArticles(accountId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Article[]>; abstract getArticle(id: string): Promise<Article | undefined>; abstract putArticles(values: Article[]): Promise<void>;
  /** Which of these article ids are already stored (no limit, unlike listArticles). */
  abstract existingArticleIds(ids: string[]): Promise<Set<string>>;
  /** Every starred article for the account, however old. */
  abstract listStarred(accountId: string): Promise<Article[]>;
  /** Unread article count per subscription id, across all stored articles. */
  abstract unreadCounts(accountId: string): Promise<Map<string, number>>;
  abstract updateArticle(id: string, change: Partial<Article>): Promise<void>; abstract markArticlesRead(accountId: string, options?: { before?: number; now?: number; subscriptionId?: string }): Promise<number>; abstract clearCachedArticles(accountId: string): Promise<number>; abstract deleteSubscription(id: string): Promise<void>;
  abstract listTags(accountId: string): Promise<Tag[]>; abstract putTags(values: Tag[]): Promise<void>; abstract deleteTags(ids: string[]): Promise<void>;
  abstract enqueue(value: PendingMutation): Promise<void>; abstract pending(accountId: string): Promise<PendingMutation[]>; abstract removePending(ids: string[]): Promise<void>;
}
