import { Injectable } from '@angular/core'; import Dexie, { Table } from 'dexie';
import { Account, Article, PendingMutation, Subscription, Tag } from '../domain/models'; import { StoragePort } from './storage.port';
class GReaderDb extends Dexie { accounts!:Table<Account,string>; subscriptions!:Table<Subscription,string>; articles!:Table<Article,string>; tags!:Table<Tag,string>; mutations!:Table<PendingMutation,string>;
 constructor(){ super('greader'); this.version(1).stores({accounts:'id,provider',subscriptions:'id,accountId,uid,sort',articles:'id,accountId,subscriptionId,uid,publishedAt,read,starred',tags:'id,accountId,uid,sort',mutations:'id,accountId,createdAt'}); }}
@Injectable({providedIn:'root'}) export class IndexedDbStorage extends StoragePort { private db=new GReaderDb();
 listAccounts(){return this.db.accounts.toArray();} async putAccount(v:Account){await this.db.accounts.put(v);}
 listSubscriptions(a:string){return this.db.subscriptions.where('accountId').equals(a).sortBy('sort');} async putSubscriptions(v:Subscription[]){await this.db.subscriptions.bulkPut(v);}
 async listArticles(a:string,o:{unreadOnly?:boolean;limit?:number}={}){let x=await this.db.articles.where('accountId').equals(a).reverse().sortBy('publishedAt'); if(o.unreadOnly)x=x.filter(i=>!i.read); return x.slice(0,o.limit??500);}
 getArticle(id:string){return this.db.articles.get(id);} async putArticles(v:Article[]){await this.db.articles.bulkPut(v);}
  async existingArticleIds(ids:string[]){if(!ids.length)return new Set<string>();const keys=await this.db.articles.where(':id').anyOf(ids).primaryKeys();return new Set<string>(keys);}
  listStarred(a:string){return this.db.articles.where('accountId').equals(a).filter(i=>!!i.starred).toArray();}
  async unreadCounts(a:string){const counts=new Map<string,number>();await this.db.articles.where('accountId').equals(a).each(i=>{if(!i.read)counts.set(i.subscriptionId,(counts.get(i.subscriptionId)??0)+1);});return counts;} async updateArticle(id:string,c:Partial<Article>){await this.db.articles.update(id,c);}
 async markArticlesRead(accountId:string,o:{before?:number;now?:number;subscriptionId?:string}={}){const now=o.now??Date.now();return this.db.articles.where('accountId').equals(accountId).filter(a=>!a.read&&(o.subscriptionId===undefined||a.subscriptionId===o.subscriptionId)&&(o.before===undefined||a.publishedAt<o.before)).modify({read:true,readAt:now});}
 async clearCachedArticles(accountId:string){return this.db.articles.where('accountId').equals(accountId).filter(a=>a.cached).modify({cached:false});} async deleteSubscription(id:string){await this.db.transaction('rw',this.db.subscriptions,this.db.articles,async()=>{await this.db.subscriptions.delete(id);await this.db.articles.where('subscriptionId').equals(id).delete();});}
 listTags(a:string){return this.db.tags.where('accountId').equals(a).sortBy('sort');} async putTags(v:Tag[]){await this.db.tags.bulkPut(v);} async deleteTags(ids:string[]){await this.db.tags.bulkDelete(ids);}
 async enqueue(v:PendingMutation){await this.db.mutations.put(v);} pending(a:string){return this.db.mutations.where('accountId').equals(a).sortBy('createdAt');} async removePending(ids:string[]){await this.db.mutations.bulkDelete(ids);}
}
