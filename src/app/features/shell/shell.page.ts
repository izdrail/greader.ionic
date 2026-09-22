import { Component, computed, OnInit, signal } from '@angular/core'; import { CommonModule, DatePipe } from '@angular/common'; import { ActivatedRoute, RouterLink } from '@angular/router'; import { FormsModule } from '@angular/forms';
import { AlertController, IonBadge,IonButton,IonButtons,IonCard,IonCardContent,IonCardHeader,IonCardSubtitle,IonCardTitle,IonChip,IonCol,IonContent,IonGrid,IonHeader,IonIcon,IonItem,IonItemOption,IonItemOptions,IonItemSliding,IonLabel,IonList,IonMenu,IonMenuButton,IonMenuToggle,IonNote,IonFooter,IonRange,IonRefresher,IonRefresherContent,IonRow,IonSearchbar,IonSegment,IonSegmentButton,IonSpinner,IonSplitPane,IonTitle,IonToolbar, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons'; import { addOutline,browsersOutline,checkmarkDoneOutline,chevronDownOutline,chevronForwardOutline,closeOutline,cloudOfflineOutline,downloadOutline,folderOutline,gridOutline,listOutline,mailOpenOutline,mailUnreadOutline,menuOutline,pauseOutline,playOutline,playBackOutline,playForwardOutline,playSkipForwardOutline,refreshOutline,settingsOutline,star,starOutline,volumeHighOutline } from 'ionicons/icons';
import { StoragePort } from '../../core/storage/storage.port'; import { Account,Article,Subscription,Tag } from '../../core/domain/models'; import { ARTICLE_LIST_MODES, MARK_READ_AGES, sortSubscriptions } from '../../core/domain/list-preferences'; import { groupByFolder } from '../../core/domain/folders'; import { ListPreferencesService } from '../../core/services/list-preferences.service'; import { ArticleActionsService } from '../../core/services/article-actions.service'; import { ThemeService } from '../../core/theme/theme.service'; import { SyncService } from '../../core/services/sync.service'; import { AppSettingsService } from '../../core/services/app-settings.service'; import { NotificationsService } from '../../core/services/notifications.service'; import { isSyncDue } from '../../core/domain/app-settings'; import { PodcastPlayerService } from '../../core/services/podcast-player.service'; import { NativeBridgeService } from '../../core/services/native-bridge.service'; import { AdsService } from '../../core/services/ads.service'; import { formatTime, PLAYBACK_RATES } from '../../core/domain/podcast-player';
import { htmlToText, snippet } from '../../core/domain/text-preview';

const MODE_ICONS: Record<string,string> = { list: 'grid-outline', grid: 'browsers-outline', card: 'list-outline' };

@Component({selector:'app-shell',templateUrl:'shell.page.html',styleUrls:['shell.page.scss'],imports:[CommonModule,FormsModule,RouterLink,IonSplitPane,IonMenu,IonHeader,IonToolbar,IonTitle,IonContent,IonList,IonItem,IonItemSliding,IonItemOptions,IonItemOption,IonLabel,IonBadge,IonNote,IonMenuToggle,IonButtons,IonMenuButton,IonButton,IonIcon,IonSearchbar,IonSegment,IonSegmentButton,IonRefresher,IonRefresherContent,IonFooter,IonRange,IonGrid,IonRow,IonCol,IonCard,IonCardHeader,IonCardTitle,IonCardSubtitle,IonCardContent,IonChip,IonSpinner],providers:[DatePipe]})
export class ShellPage implements OnInit {
  accounts=signal<Account[]>([]);subscriptions=signal<Subscription[]>([]);folders=signal<Tag[]>([]);articles=signal<Article[]>([]);loading=signal(true);loadError=signal(false);query=signal('');filter=signal<'all'|'unread'|'starred'>('all');selectedSub=signal<string|undefined>(undefined);collapsed=signal<ReadonlySet<string>>(new Set());
  selectedSubTitle=computed(()=>this.subscriptions().find(s=>s.id===this.selectedSub())?.title);
  visible=computed(()=>this.articles().filter(x=>(!this.selectedSub()||x.subscriptionId===this.selectedSub())&&(this.filter()==='all'||this.filter()==='unread'&&!x.read||this.filter()==='starred'&&x.starred)&&(!this.query()||`${x.title} ${x.author??''}`.toLowerCase().includes(this.query().toLowerCase()))));
  foldered=computed(()=>groupByFolder(this.subscriptions(),this.folders(),this.prefs.feedSort()));
  nextModeIcon=computed(()=>MODE_ICONS[this.prefs.listMode()]);

  constructor(private db:StoragePort,private route:ActivatedRoute,private bridge:NativeBridgeService,private themes:ThemeService,private actions:ArticleActionsService,private alerts:AlertController,private toasts:ToastController,public prefs:ListPreferencesService,private sync:SyncService,private appSettings:AppSettingsService,private notifications:NotificationsService,public player:PodcastPlayerService,private ads:AdsService,private datePipe:DatePipe){
    addIcons({menuOutline,refreshOutline,settingsOutline,listOutline,gridOutline,browsersOutline,downloadOutline,volumeHighOutline,star,starOutline,cloudOfflineOutline,addOutline,checkmarkDoneOutline,mailOpenOutline,mailUnreadOutline,folderOutline,chevronDownOutline,chevronForwardOutline,pauseOutline,playOutline,playBackOutline,playForwardOutline,playSkipForwardOutline,closeOutline});
  }

  async ngOnInit(){const sub=this.route.snapshot.queryParamMap.get('sub');if(sub)this.selectedSub.set(sub);await this.themes.init();await Promise.all([this.prefs.init(),this.appSettings.init(),this.player.init()]);await this.load();await this.syncIfNeeded();}

  /** The article list carries the AdMob banner; it shows while this view is active and hides everywhere else. */
  async ionViewWillEnter(){await this.ads.showBanner();}

  async ionViewWillLeave(){await this.ads.hideBanner();}

  /** Startup + interval sync honoring the persisted settings; notifies with the new-article count. */
  private async syncIfNeeded(force=false){
    const account=this.accounts()[0];if(!account)return;
    const settings=this.appSettings.settings();
    if(!force&&!settings.syncOnStartup&&!account.lastSyncAt)return;
    if(!force&&!isSyncDue(account.lastSyncAt,settings.syncIntervalHours,Date.now()))return;
    try{
      const outcome=await this.sync.sync(account);
      await this.load();
      await this.notifications.notifySyncResult(outcome.newArticles,{notify:settings.notifyAfterSync,vibrate:settings.vibrate});
      await this.notifications.notifyFeedAlerts(outcome.feedAlerts,{notify:settings.notifyAfterSync});
    }catch{/* offline or provider error; the sync service records lastError */}
  }

  async load(){
    try{
    const a=await this.db.listAccounts();this.accounts.set(a);
    if(a[0]){
      const [subs,articles,tags]=await Promise.all([this.db.listSubscriptions(a[0].id),this.db.listArticles(a[0].id),this.db.listTags(a[0].id)]);
      this.folders.set(tags.filter(t=>t.type==='folder'));
      this.articles.set(articles);
      const unread=new Map<string,number>(); for(const article of articles) if(!article.read) unread.set(article.subscriptionId,(unread.get(article.subscriptionId)??0)+1);
      const counted=subs.map(s=>({...s,unreadCount:unread.get(s.id)??0}));
      if(counted.some((s,i)=>s.unreadCount!==subs[i].unreadCount)) await this.db.putSubscriptions(counted);
      this.subscriptions.set(counted);
      const totalUnread=[...unread.values()].reduce((a,b)=>a+b,0);
      this.bridge.updateUnread(totalUnread);
    }
    this.loadError.set(false);
    }catch{this.loadError.set(true);}
    this.loading.set(false);
    this.textCache.clear();
  }

  /** Error-state retry: a deliberate reload, not an automatic loop. */
  async retryLoad(){this.loading.set(true);this.loadError.set(false);await this.load();}

  async refresh(e:any){await this.load();await this.syncIfNeeded(true);e.target.complete();}

  toggleFolder(id:string){this.collapsed.update(set=>{const next=new Set(set);if(next.has(id))next.delete(id);else next.add(id);return next;});}

  async toggleRead(article:Article){this.patch(await this.actions.setRead(article,!article.read));}
  async toggleStar(article:Article){this.patch(await this.actions.setStarred(article,!article.starred));}
  private patch(updated:Article){this.articles.update(list=>list.map(x=>x.id===updated.id?updated:x));}

  async cycleListMode(){const order=ARTICLE_LIST_MODES.map(x=>x.id);const next=order[(order.indexOf(this.prefs.listMode())+1)%order.length];await this.prefs.setListMode(next);}

  async confirmMarkAll(){
    const account=this.accounts()[0];if(!account)return;
    const alert=await this.alerts.create({header:'Mark articles as read',inputs:MARK_READ_AGES.map((age,i)=>({type:'radio',label:age.label,value:age.id,checked:i===0})),buttons:[{text:'Cancel',role:'cancel'},{text:'Mark read',handler:async ageId=>{const count=await this.actions.markAllRead(account.id,ageId);await this.load();const toast=await this.toasts.create({message:`Marked ${count} article${count===1?'':'s'} as read`,duration:2000,position:'bottom'});await toast.present();}}]});
    await alert.present();
  }


  private textCache=new Map<string,string>();
  /** Clean single-line preview - feed HTML never reaches the list raw. */
  preview(article:Article){let v=this.textCache.get(article.id);if(v===undefined){v=snippet(article.content,180);this.textCache.set(article.id,v);}return v;}
  cleanTitle(article:Article){const key=`${article.id}:t`;let v=this.textCache.get(key);if(v===undefined){v=htmlToText(article.title)||'Untitled article';this.textCache.set(key,v);}return v;}
  private feedTitles=computed(()=>new Map(this.subscriptions().map(s=>[s.id,s.title]as const)));
  /** "author · feed · date" with every missing part dropped, never dangling separators. */
  meta(article:Article){const parts=[article.author,this.feedTitles().get(article.subscriptionId),article.publishedAt>0?this.datePipe.transform(article.publishedAt,'medium'):undefined];return parts.filter(Boolean).join(' · ');}
  /** A broken article image collapses instead of leaving a dead image box. */
  hideBrokenImage(e:Event){(e.target as HTMLElement).style.display='none';}

  fmt=formatTime;
  async cycleRate(){const i=PLAYBACK_RATES.indexOf(this.player.rate());await this.player.setRate(PLAYBACK_RATES[(i+1)%PLAYBACK_RATES.length]);}
  quick(e:Event){e.preventDefault();e.stopPropagation();}
  clearFeedFilter(){this.selectedSub.set(undefined);}
  track(_:number,x:{id:string}){return x.id;}
}
