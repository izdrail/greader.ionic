import { Component, OnInit, computed, signal } from '@angular/core';import { CommonModule } from '@angular/common';import { FormsModule } from '@angular/forms';import { RouterLink } from '@angular/router';import { AlertController, IonBackButton,IonBadge,IonButton,IonButtons,IonContent,IonHeader,IonIcon,IonItem,IonLabel,IonList,IonReorder,IonReorderGroup,IonSelect,IonSelectOption,IonTitle,IonToggle,IonToolbar,ItemReorderEventDetail } from '@ionic/angular';import { addIcons } from 'ionicons';import { createOutline, downloadOutline, folderOutline, reorderTwoOutline, trashOutline } from 'ionicons/icons';import { StoragePort } from '../../core/storage/storage.port';import { Account, Subscription, Tag } from '../../core/domain/models';import { reorderedWithSort, sortSubscriptions } from '../../core/domain/list-preferences';import { createFolder, unfileSubscriptions } from '../../core/domain/folders';import { applyFeedPrefs, FEED_CHOICES, FEED_TOGGLES } from '../../core/domain/feed-prefs';import { ListPreferencesService } from '../../core/services/list-preferences.service';import { OpmlExportService } from '../../core/services/opml-export.service';
@Component({selector:'app-subscriptions',template:`<ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/feeds"></ion-back-button></ion-buttons><ion-title>Manage subscriptions</ion-title><ion-buttons slot="end"><ion-button aria-label="New folder" (click)="newFolder()"><ion-icon name="folder-outline"></ion-icon></ion-button><ion-button aria-label="Export OPML" (click)="exportOpml()"><ion-icon name="download-outline"></ion-icon></ion-button><ion-button [attr.aria-label]="reordering() ? 'Done reordering' : 'Reorder feeds'" (click)="reordering.set(!reordering())"><ion-icon name="reorder-two-outline"></ion-icon></ion-button><ion-button routerLink="/subscribe">Add</ion-button></ion-buttons></ion-toolbar></ion-header><ion-content><ion-list inset *ngIf="folders().length"><ion-item lines="full"><ion-label><strong>Folders</strong></ion-label></ion-item><ion-item *ngFor="let folder of folders(); trackBy: track"><ion-icon name="folder-outline" slot="start"></ion-icon><ion-label>{{folder.label}}</ion-label><ion-button slot="end" fill="clear" [attr.aria-label]="'Rename ' + folder.label" (click)="renameFolder(folder)"><ion-icon name="create-outline"></ion-icon></ion-button><ion-button slot="end" fill="clear" color="danger" [attr.aria-label]="'Delete ' + folder.label" (click)="deleteFolder(folder)"><ion-icon name="trash-outline"></ion-icon></ion-button></ion-item></ion-list><ion-list inset><ion-reorder-group [disabled]="!reordering()" (ionItemReorder)="handleReorder($event)"><ng-container *ngFor="let sub of sorted(); trackBy: track"><ion-item button (click)="toggleEditor(sub.id)"><ion-label><h2>{{sub.title}}</h2><p>{{sub.feedUrl || sub.htmlUrl}}</p></ion-label><ion-select slot="end" interface="action-sheet" placeholder="No folder" [value]="sub.folderId ?? ''" (ionChange)="setFolder(sub, $event.detail.value)" (click)="$event.stopPropagation()" *ngIf="!reordering()"><ion-select-option value="">No folder</ion-select-option><ion-select-option *ngFor="let folder of folders()" [value]="folder.id">{{folder.label}}</ion-select-option></ion-select><ion-badge slot="end">{{sub.unreadCount}}</ion-badge><ion-reorder slot="end" (click)="$event.stopPropagation()"></ion-reorder></ion-item><ion-list class="prefs" *ngIf="expandedId()===sub.id"><ion-item *ngFor="let t of toggles" lines="inset"><ion-toggle [ngModel]="sub[t.key]" (ngModelChange)="setPref(sub, t.key, $event)">{{t.label}}</ion-toggle></ion-item><ion-item *ngFor="let c of choices" lines="inset"><ion-select [label]="c.label" label-placement="stacked" [ngModel]="sub[c.key]" (ngModelChange)="setPref(sub, c.key, $event)"><ion-select-option *ngFor="let o of c.options" [value]="o.value">{{o.label}}</ion-select-option></ion-select></ion-item></ion-list></ng-container></ion-reorder-group></ion-list></ion-content>`,imports:[CommonModule,FormsModule,RouterLink,IonHeader,IonToolbar,IonButtons,IonBackButton,IonTitle,IonButton,IonIcon,IonContent,IonList,IonItem,IonLabel,IonBadge,IonSelect,IonSelectOption,IonToggle,IonReorder,IonReorderGroup]})
export class SubscriptionsPage implements OnInit{
  account=signal<Account|undefined>(undefined);subscriptions=signal<Subscription[]>([]);folders=signal<Tag[]>([]);reordering=signal(false);expandedId=signal<string|undefined>(undefined);toggles=FEED_TOGGLES;choices=FEED_CHOICES;
  sorted=computed(()=>this.reordering()?sortSubscriptions(this.subscriptions(),'custom'):sortSubscriptions(this.subscriptions(),this.prefs.feedSort()));
  constructor(private db:StoragePort,public prefs:ListPreferencesService,private opml:OpmlExportService,private alerts:AlertController){addIcons({reorderTwoOutline,downloadOutline,folderOutline,createOutline,trashOutline});}
  async ngOnInit(){await this.prefs.init();const a=(await this.db.listAccounts())[0];this.account.set(a);if(a){await this.load(a.id);}}
  private async load(accountId:string){const [subs,tags]=await Promise.all([this.db.listSubscriptions(accountId),this.db.listTags(accountId)]);this.subscriptions.set(subs);this.folders.set(tags.filter(t=>t.type==='folder'));}
  async newFolder(){
    const account=this.account();if(!account)return;
    const alert=await this.alerts.create({header:'New folder',inputs:[{name:'label',type:'text',placeholder:'Folder name'}],buttons:[{text:'Cancel',role:'cancel'},{text:'Create',handler:async data=>{const label=(data.label??'').trim();if(!label)return;const folders=this.folders();await this.db.putTags([createFolder(account.id,label,folders.length)]);await this.load(account.id);}}]});
    await alert.present();
  }
  toggleEditor(id:string){this.expandedId.update(current=>current===id?undefined:id);}
  async setPref(sub:Subscription,key:string,value:boolean|number){const next=applyFeedPrefs(sub,{[key]:value});this.subscriptions.update(list=>list.map(s=>s.id===sub.id?next:s));await this.db.putSubscriptions([next]);}
  async renameFolder(folder:Tag){
    const account=this.account();if(!account)return;
    const alert=await this.alerts.create({header:'Rename folder',inputs:[{name:'label',type:'text',value:folder.label,placeholder:'Folder name'}],buttons:[{text:'Cancel',role:'cancel'},{text:'Rename',handler:async data=>{const label=(data.label??'').trim();if(!label||label===folder.label)return;await this.db.putTags([{...folder,label,uid:`user/-/label/${label}`}]);await this.load(account.id);}}]});
    await alert.present();
  }
  async deleteFolder(folder:Tag){
    const account=this.account();if(!account)return;
    const alert=await this.alerts.create({header:'Delete folder',message:`Feeds in "${folder.label}" move back to the unfiled list.`,buttons:[{text:'Cancel',role:'cancel'},{text:'Delete',role:'destructive',handler:async()=>{
      const unfiled=unfileSubscriptions(this.subscriptions(),folder.id);
      this.subscriptions.set(unfiled);
      const changed=unfiled.filter(s=>s.folderId===undefined);
      await Promise.all([this.db.deleteTags([folder.id]),changed.length?this.db.putSubscriptions(changed):Promise.resolve()]);
      await this.load(account.id);
    }}]});
    await alert.present();
  }
  async setFolder(sub:Subscription,folderId:string){const account=this.account();if(!account)return;const next=this.subscriptions().map(s=>s.id===sub.id?{...s,folderId:folderId||undefined}:s);this.subscriptions.set(next);await this.db.putSubscriptions(next.filter(s=>s.id===sub.id));}
  async exportOpml(){await this.opml.export(sortSubscriptions(this.subscriptions(),'custom'));}
  async handleReorder(event:CustomEvent<ItemReorderEventDetail>){
    const next=reorderedWithSort(this.subscriptions(),event.detail.from,event.detail.to);
    this.subscriptions.set(next);
    await Promise.all([this.db.putSubscriptions(next),this.prefs.setFeedSort('custom')]);
    event.detail.complete();
  }
  track(_:number,x:{id:string}){return x.id;}
}
