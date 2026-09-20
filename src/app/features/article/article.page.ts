import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { contrastOutline, globeOutline, imageOutline, shareOutline, star, starOutline, textOutline, volumeHighOutline } from 'ionicons/icons';
import { Article, ReadingMode } from '../../core/domain/models';
import { absolutizeUrls, extractMainContent } from '../../core/domain/readability';
import { StoragePort } from '../../core/storage/storage.port';
import { FeedHttpService } from '../../core/services/feed-http.service';
import { ListPreferencesService } from '../../core/services/list-preferences.service';

@Component({
  selector: 'app-article',
  template: `<ion-header><ion-toolbar color="primary"><ion-buttons slot="start"><ion-back-button defaultHref="/feeds"></ion-back-button></ion-buttons><ion-title>{{article()?.title||'Article'}}</ion-title><ion-buttons slot="end"><ion-button (click)="toggleStar()"><ion-icon [name]="article()?.starred?'star':'star-outline'"></ion-icon></ion-button><ion-button (click)="speak()"><ion-icon name="volume-high-outline"></ion-icon></ion-button><ion-button (click)="share()"><ion-icon name="share-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar><ion-toolbar><ion-segment [value]="mode()" (ionChange)="setMode($any($event.detail.value))"><ion-segment-button value="feed">Feed</ion-segment-button><ion-segment-button value="simplified">Reading</ion-segment-button><ion-segment-button value="original">Web</ion-segment-button></ion-segment></ion-toolbar><ion-toolbar><ion-buttons slot="end"><ion-button aria-label="Decrease font size" (click)="font(-0.1)"><ion-icon name="text-outline"></ion-icon></ion-button><ion-button aria-label="Increase font size" (click)="font(0.1)"><strong style="font-size:1.25rem">A</strong></ion-button><ion-button aria-label="Invert colors" [class.active]="prefs.invert()" (click)="prefs.setInvert(!prefs.invert())"><ion-icon name="contrast-outline"></ion-icon></ion-button><ion-button aria-label="Fit images" [class.active]="prefs.imageFit()" (click)="prefs.setImageFit(!prefs.imageFit())"><ion-icon name="image-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar></ion-header>
  <ion-content class="ion-padding" [class.invert]="prefs.invert()"><div class="loading" *ngIf="extracting()"><ion-spinner></ion-spinner><p>Extracting article…</p></div><article *ngIf="article() as item" [style.font-size.rem]="prefs.fontScale()" [class.fit-images]="prefs.imageFit()"><h1>{{item.title}}</h1><p class="byline">{{item.author}} · {{item.publishedAt|date:'medium'}}</p><img *ngIf="item.image" [src]="item.image" alt=""><div [innerHTML]="body()"></div><p class="extract-error" *ngIf="extractError()">{{extractError()}}</p><audio *ngIf="item.audio" [src]="item.audio" controls></audio><video *ngIf="item.video" [src]="item.video" controls></video><ion-button *ngIf="mode()==='original'&&item.link" (click)="openWeb()"><ion-icon name="globe-outline" slot="start"></ion-icon>Open original page</ion-button></article></ion-content>`,
  styles: [`article{max-width:760px;margin:auto;line-height:1.65}article img,video{max-width:100%;height:auto}article.fit-images img{max-width:100%!important;height:auto!important}.byline{color:var(--ion-color-medium)}audio{width:100%}.invert article{filter:invert(0.92) hue-rotate(180deg)}.loading{text-align:center;padding:3rem;color:var(--ion-color-medium)}.extract-error{color:var(--ion-color-warning-shade)}ion-button.active{--color:var(--ion-color-warning)}`],
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonSegment, IonSegmentButton, IonContent, IonSpinner],
})
export class ArticlePage implements OnInit {
  article = signal<Article | undefined>(undefined);
  mode = signal<ReadingMode>('feed');
  extracted = signal<string | undefined>(undefined);
  extracting = signal(false);
  extractError = signal<string | undefined>(undefined);
  body = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(
    (this.mode() === 'simplified' && this.extracted()) || this.article()?.content || '<p>No article content was included in this feed.</p>'));

  constructor(private route: ActivatedRoute, private db: StoragePort, private http: FeedHttpService, private sanitizer: DomSanitizer, public prefs: ListPreferencesService) {
    addIcons({ shareOutline, star, starOutline, volumeHighOutline, globeOutline, textOutline, contrastOutline, imageOutline });
  }

  async ngOnInit() {
    await this.prefs.init();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const a = await this.db.getArticle(id);
      this.article.set(a);
      if (a && !a.read) await this.db.updateArticle(id, { read: true, readAt: Date.now() });
    }
  }

  async setMode(mode: ReadingMode) {
    this.mode.set(mode);
    if (mode === 'simplified' && !this.extracted() && !this.extracting()) await this.extract();
  }

  private async extract() {
    const a = this.article();
    if (!a?.link) { this.extractError.set('This article has no source page to extract from.'); return; }
    this.extracting.set(true);
    this.extractError.set(undefined);
    try {
      const response = await this.http.get(a.link);
      if (response.status < 200 || response.status >= 300) throw new Error(`Source page request failed (${response.status})`);
      this.extracted.set(absolutizeUrls(extractMainContent(response.body), a.link));
    } catch (error) {
      this.extractError.set(error instanceof Error ? `Could not extract the article: ${error.message}` : 'Could not extract the article.');
    } finally {
      this.extracting.set(false);
    }
  }

  async font(delta: number) { await this.prefs.setFontScale(this.prefs.fontScale() + delta); }
  async toggleStar() { const a = this.article(); if (!a) return; const starred = !a.starred; await this.db.updateArticle(a.id, { starred }); this.article.set({ ...a, starred }); }
  async share() { const a = this.article(); if (a) await Share.share({ title: a.title, text: a.title, url: a.link }); }
  async openWeb() { const url = this.article()?.link; if (url) await Browser.open({ url }); }
  speak() {
    const a = this.article(); if (!a || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(`${a.title}. ${new DOMParser().parseFromString(a.content || '', 'text/html').body.textContent || ''}`));
  }
}
