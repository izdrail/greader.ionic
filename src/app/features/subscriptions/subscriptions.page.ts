import { Component, OnInit, computed, signal } from '@angular/core';import { CommonModule } from '@angular/common';import { RouterLink } from '@angular/router';import { IonBackButton,IonBadge,IonButton,IonButtons,IonContent,IonHeader,IonIcon,IonItem,IonLabel,IonList,IonReorder,IonReorderGroup,IonTitle,IonToolbar,ItemReorderEventDetail } from '@ionic/angular';import { addIcons } from 'ionicons';import { downloadOutline, reorderTwoOutline } from 'ionicons/icons';import { StoragePort } from '../../core/storage/storage.port';import { Subscription } from '../../core/domain/models';import { reorderedWithSort, sortSubscriptions } from '../../core/domain/list-preferences';import { ListPreferencesService } from '../../core/services/list-preferences.service';import { OpmlExportService } from '../../core/services/opml-export.service';
@Component({selector:'app-subscriptions',template:`<ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/feeds"></ion-back-button></ion-buttons><ion-title>Manage subscriptions</ion-title><ion-buttons slot="end"><ion-button aria-label="Export OPML" (click)="exportOpml()"><ion-icon name="download-outline"></ion-icon></ion-button><ion-button [attr.aria-label]="reordering() ? 'Done reordering' : 'Reorder feeds'" (click)="reordering.set(!reordering())"><ion-icon name="reorder-two-outline"></ion-icon></ion-button><ion-button routerLink="/subscribe">Add</ion-button></ion-buttons></ion-toolbar></ion-header><ion-content><ion-list inset><ion-reorder-group [disabled]="!reordering()" (ionItemReorder)="handleReorder($event)"><ion-item *ngFor="let sub of sorted(); trackBy: track"><ion-label><h2>{{sub.title}}</h2><p>{{sub.feedUrl || sub.htmlUrl}}</p></ion-label><ion-badge slot="end">{{sub.unreadCount}}</ion-badge><ion-reorder slot="end"></ion-reorder></ion-item></ion-reorder-group></ion-list></ion-content>`,imports:[CommonModule,RouterLink,IonHeader,IonToolbar,IonButtons,IonBackButton,IonTitle,IonButton,IonIcon,IonContent,IonList,IonItem,IonLabel,IonBadge,IonReorder,IonReorderGroup]})
export class SubscriptionsPage implements OnInit{
  subscriptions=signal<Subscription[]>([]);reordering=signal(false);
  sorted=computed(()=>this.reordering()?sortSubscriptions(this.subscriptions(),'custom'):sortSubscriptions(this.subscriptions(),this.prefs.feedSort()));
  constructor(private db:StoragePort,public prefs:ListPreferencesService,private opml:OpmlExportService){addIcons({reorderTwoOutline,downloadOutline});}
  async exportOpml(){await this.opml.export(sortSubscriptions(this.subscriptions(),'custom'));}
  async ngOnInit(){await this.prefs.init();const a=(await this.db.listAccounts())[0];if(a)this.subscriptions.set(await this.db.listSubscriptions(a.id));}
  async handleReorder(event:CustomEvent<ItemReorderEventDetail>){
    const next=reorderedWithSort(this.subscriptions(),event.detail.from,event.detail.to);
    this.subscriptions.set(next);
    await Promise.all([this.db.putSubscriptions(next),this.prefs.setFeedSort('custom')]);
    event.detail.complete();
  }
  track(_:number,x:{id:string}){return x.id;}
}
