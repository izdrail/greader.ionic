import { Component, computed, OnInit, signal } from '@angular/core'; import { CommonModule } from '@angular/common'; import { RouterLink } from '@angular/router'; import { FormsModule } from '@angular/forms';
import { AlertController, IonBadge,IonButton,IonButtons,IonCard,IonCardContent,IonCardHeader,IonCardSubtitle,IonCardTitle,IonCol,IonContent,IonGrid,IonHeader,IonIcon,IonItem,IonItemOption,IonItemOptions,IonItemSliding,IonLabel,IonList,IonMenu,IonMenuButton,IonMenuToggle,IonNote,IonRefresher,IonRefresherContent,IonRow,IonSearchbar,IonSegment,IonSegmentButton,IonSplitPane,IonTitle,IonToolbar, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons'; import { addOutline,browsersOutline,checkmarkDoneOutline,chevronDownOutline,chevronForwardOutline,cloudOfflineOutline,downloadOutline,folderOutline,gridOutline,listOutline,mailOpenOutline,mailUnreadOutline,menuOutline,refreshOutline,settingsOutline,star,starOutline,volumeHighOutline } from 'ionicons/icons';
import { StoragePort } from '../../core/storage/storage.port'; import { Account,Article,Subscription,Tag } from '../../core/domain/models'; import { ARTICLE_LIST_MODES, MARK_READ_AGES, sortSubscriptions } from '../../core/domain/list-preferences'; import { groupByFolder } from '../../core/domain/folders'; import { ListPreferencesService } from '../../core/services/list-preferences.service'; import { ArticleActionsService } from '../../core/services/article-actions.service'; import { ThemeService } from '../../core/theme/theme.service';

const MODE_ICONS: Record<string,string> = { list: 'grid-outline', grid: 'browsers-outline', card: 'list-outline' };

@Component({selector:'app-shell',templateUrl:'shell.page.html',styleUrls:['shell.page.scss'],imports:[CommonModule,FormsModule,RouterLink,IonSplitPane,IonMenu,IonHeader,IonToolbar,IonTitle,IonContent,IonList,IonItem,IonItemSliding,IonItemOptions,IonItemOption,IonLabel,IonBadge,IonNote,IonMenuToggle,IonButtons,IonMenuButton,IonButton,IonIcon,IonSearchbar,IonSegment,IonSegmentButton,IonRefresher,IonRefresherContent,IonGrid,IonRow,IonCol,IonCard,IonCardHeader,IonCardTitle,IonCardSubtitle,IonCardContent]})
export class ShellPage implements OnInit {
  accounts=signal<Account[]>([]);subscriptions=signal<Subscription[]>([]);folders=signal<Tag[]>([]);articles=signal<Article[]>([]);query=signal('');filter=signal<'all'|'unread'|'starred'>('all');collapsed=signal<ReadonlySet<string>>(new Set());
  visible=computed(()=>this.articles().filter(x=>(this.filter()==='all'||this.filter()==='unread'&&!x.read||this.filter()==='starred'&&x.starred)&&(!this.query()||`${x.title} ${x.author??''}`.toLowerCase().includes(this.query().toLowerCase()))));
  foldered=computed(()=>groupByFolder(this.subscriptions(),this.folders(),this.prefs.feedSort()));
  nextModeIcon=computed(()=>MODE_ICONS[this.prefs.listMode()]);

  constructor(private db:StoragePort,private themes:ThemeService,private actions:ArticleActionsService,private alerts:AlertController,private toasts:ToastController,public prefs:ListPreferencesService){
    addIcons({menuOutline,refreshOutline,settingsOutline,listOutline,gridOutline,browsersOutline,downloadOutline,volumeHighOutline,star,starOutline,cloudOfflineOutline,addOutline,checkmarkDoneOutline,mailOpenOutline,mailUnreadOutline,folderOutline,chevronDownOutline,chevronForwardOutline});
  }

  async ngOnInit(){await this.themes.init();await this.prefs.init();await this.load();}

  async load(){
    const a=await this.db.listAccounts();this.accounts.set(a);
    if(a[0]){
      const [subs,articles,tags]=await Promise.all([this.db.listSubscriptions(a[0].id),this.db.listArticles(a[0].id),this.db.listTags(a[0].id)]);
      this.folders.set(tags.filter(t=>t.type==='folder'));
      this.articles.set(articles);
      const unread=new Map<string,number>(); for(const article of articles) if(!article.read) unread.set(article.subscriptionId,(unread.get(article.subscriptionId)??0)+1);
      const counted=subs.map(s=>({...s,unreadCount:unread.get(s.id)??0}));
      if(counted.some((s,i)=>s.unreadCount!==subs[i].unreadCount)) await this.db.putSubscriptions(counted);
      this.subscriptions.set(counted);
    }
  }

  async refresh(e:any){await this.load();e.target.complete();}

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

  quick(e:Event){e.preventDefault();e.stopPropagation();}
  track(_:number,x:{id:string}){return x.id;}
}
