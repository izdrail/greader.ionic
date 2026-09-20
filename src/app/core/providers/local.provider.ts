import { Injectable } from '@angular/core';
import { FeedParserService } from '../feeds/feed-parser.service';
import { ProviderAdapter, SyncSnapshot } from './provider.port';
import { Account, Article, PendingMutation } from '../domain/models';
import { newItems, stableId } from '../domain/feed-refresh';
import { StoragePort } from '../storage/storage.port';
import { FeedHttpService } from '../services/feed-http.service';

/**
 * Local RSS provider: subscriptions live in IndexedDB and sync re-fetches each
 * feed (skipping feeds excluded from sync), storing only items whose uid is not
 * already present. Subscription flags never leave storage, so user preferences
 * (folder, notification, sync exclusion) survive every refresh.
 */
@Injectable({providedIn:'root'}) export class LocalProvider extends ProviderAdapter {
  readonly kind='local' as const;
  constructor(private parser:FeedParserService, private storage:StoragePort, private http:FeedHttpService){super();}
  async connect(){return{id:crypto.randomUUID(),provider:this.kind,label:'Local RSS',createdAt:Date.now()};}
  async sync(account:Account):Promise<SyncSnapshot>{
    const subscriptions=(await this.storage.listSubscriptions(account.id)).filter(s=>s.feedUrl&&!s.syncExcluded);
    const existing=new Set((await this.storage.listArticles(account.id)).map(a=>a.uid));
    const articles:Article[]=[];
    await Promise.all(subscriptions.map(async sub=>{
      try{
        const response=await this.http.get(sub.feedUrl!);
        if(response.status<200||response.status>=300)return;
        const parsed=this.parser.parse(response.body);
        for(const item of newItems(existing,parsed.items)){
          articles.push({id:stableId(account.id,item.uid),accountId:account.id,subscriptionId:sub.id,uid:item.uid,title:item.title,content:item.content,author:item.author,link:item.link,image:item.image,audio:item.audio,video:item.video,publishedAt:item.publishedAt,updatedAt:item.publishedAt,starred:false,cached:true,read:false,keepUnread:false});
        }
      }catch{/* feed unreachable this cycle; try again on the next one */}
    }));
    return{subscriptions:[],tags:[],articles};
  }
  async push(_a:Account,c:PendingMutation[]){return c.map(x=>x.id);}
  parse(xml:string){return this.parser.parse(xml);}
}
