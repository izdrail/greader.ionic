import { Account, Article, PendingMutation, Subscription, Tag } from '../domain/models';
export abstract class StoragePort {
  abstract listAccounts(): Promise<Account[]>; abstract putAccount(value: Account): Promise<void>;
  abstract listSubscriptions(accountId: string): Promise<Subscription[]>; abstract putSubscriptions(values: Subscription[]): Promise<void>;
  abstract listArticles(accountId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Article[]>; abstract putArticles(values: Article[]): Promise<void>;
  abstract updateArticle(id: string, change: Partial<Article>): Promise<void>;
  abstract listTags(accountId: string): Promise<Tag[]>; abstract putTags(values: Tag[]): Promise<void>;
  abstract enqueue(value: PendingMutation): Promise<void>; abstract pending(accountId: string): Promise<PendingMutation[]>; abstract removePending(ids: string[]): Promise<void>;
}
