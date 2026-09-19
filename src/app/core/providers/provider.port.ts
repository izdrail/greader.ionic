import { Account, Article, PendingMutation, Subscription, Tag } from '../domain/models';
export interface SyncSnapshot { subscriptions: Subscription[]; tags: Tag[]; articles: Article[]; cursor?: string; }
export abstract class ProviderAdapter { abstract readonly kind: Account['provider']; abstract connect(): Promise<Account>; abstract sync(account:Account,cursor?:string):Promise<SyncSnapshot>; abstract push(account:Account,changes:PendingMutation[]):Promise<string[]>; }
