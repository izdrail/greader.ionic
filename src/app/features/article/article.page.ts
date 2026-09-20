import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { contractOutline, contrastOutline, globeOutline, headsetOutline, imageOutline, shareOutline, star, starOutline, textOutline, volumeHighOutline } from 'ionicons/icons';
import { Article, ReadingMode } from '../../core/domain/models';
import { extractMedia, MediaItem, youtubeThumbnail } from '../../core/domain/media';
import { absolutizeUrls, extractMainContent } from '../../core/domain/readability';
import { StoragePort } from '../../core/storage/storage.port';
import { FeedHttpService } from '../../core/services/feed-http.service';
import { ListPreferencesService } from '../../core/services/list-preferences.service';
import { TtsService } from '../../core/services/tts.service';
import { PodcastPlayerService } from '../../core/services/podcast-player.service';

@Component({
  selector: 'app-article',
  template: `<ion-header><ion-toolbar color="primary"><ion-buttons slot="start"><ion-back-button defaultHref="/feeds"></ion-back-button></ion-buttons><ion-title>{{article()?.title||'Article'}}</ion-title><ion-buttons slot="end"><ion-button (click)="toggleStar()"><ion-icon [name]="article()?.starred?'star':'star-outline'"></ion-icon></ion-button><ion-button (click)="speak()"><ion-icon name="volume-high-outline"></ion-icon></ion-button><ion-button (click)="share()"><ion-icon name="share-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar><ion-toolbar><ion-segment [value]="mode()" (ionChange)="setMode($any($event.detail.value))"><ion-segment-button value="feed">Feed</ion-segment-button><ion-segment-button value="simplified">Reading</ion-segment-button><ion-segment-button value="original">Web</ion-segment-button></ion-segment></ion-toolbar><ion-toolbar><ion-buttons slot="end"><ion-button aria-label="Decrease font size" (click)="font(-0.1)"><ion-icon name="text-outline"></ion-icon></ion-button><ion-button aria-label="Increase font size" (click)="font(0.1)"><strong style="font-size:1.25rem">A</strong></ion-button><ion-button aria-label="Invert colors" [class.active]="prefs.invert()" (click)="prefs.setInvert(!prefs.invert())"><ion-icon name="contrast-outline"></ion-icon></ion-button><ion-button aria-label="Fit images" [class.active]="prefs.imageFit()" (click)="prefs.setImageFit(!prefs.imageFit())"><ion-icon name="image-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar></ion-header>
  <ion-content class="ion-padding" [class.invert]="prefs.invert()"><div class="loading" *ngIf="extracting()"><ion-spinner></ion-spinner><p>Extracting article…</p></div><article *ngIf="article() as item" [style.font-size.rem]="prefs.fontScale()" [class.fit-images]="prefs.imageFit()"><h1>{{item.title}}</h1><p class="byline">{{item.author}} · {{item.publishedAt|date:'medium'}}</p><img *ngIf="item.image" [src]="item.image" alt=""><div class="media" *ngFor="let m of media()">
      <div class="yt" *ngIf="m.type==='youtube'">
        <img *ngIf="activeEmbed()!==m.videoId" [src]="thumb(m.videoId)" alt="YouTube video" (click)="playEmbed(m.videoId)"><button class="yt-play" *ngIf="activeEmbed()!==m.videoId" (click)="playEmbed(m.videoId)" aria-label="Play YouTube video">&#9654;</button>
        <iframe *ngIf="activeEmbed()===m.videoId" [src]="embedUrl(m)" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>
      </div>
      <div class="gif" *ngIf="m.type==='gif'" (click)="gifOverlay.set(m.url)"><img [src]="m.url" alt="GIF"><span class="badge">GIF</span></div>
      <div class="vid" *ngIf="m.type==='video'"><video #vidEl [src]="m.url" controls></video><ion-button *ngIf="pipSupported" size="small" fill="outline" (click)="togglePip(vidEl)"><ion-icon name="contract-outline" slot="start"></ion-icon>Picture in picture</ion-button></div>
    </div>
    <div [innerHTML]="body()"></div><p class="extract-error" *ngIf="extractError()">{{extractError()}}</p><ion-button *ngIf="item.audio" (click)="playAudio()"><ion-icon name="headset-outline" slot="start"></ion-icon>Play podcast episode</ion-button><video *ngIf="item.video" [src]="item.video" controls></video><ion-button *ngIf="mode()==='original'&&item.link" (click)="openWeb()"><ion-icon name="globe-outline" slot="start"></ion-icon>Open original page</ion-button></article><div class="gif-overlay" *ngIf="gifOverlay()" (click)="gifOverlay.set(undefined)"><img [src]="gifOverlay()" alt="GIF fullscreen"></div></ion-content>`,
  styles: [`article{max-width:760px;margin:auto;line-height:1.65}.media{margin:0 0 1rem}.yt{position:relative;aspect-ratio:16/9;background:#000}.yt img{width:100%;height:100%;object-fit:cover;cursor:pointer}.yt iframe{width:100%;height:100%;border:0;position:absolute;inset:0}.yt-play{position:absolute;inset:0;margin:auto;width:64px;height:64px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;font-size:1.5rem;cursor:pointer}.gif{position:relative;cursor:zoom-in}.gif img{max-width:100%}.gif .badge{position:absolute;top:.5rem;left:.5rem;background:rgba(0,0,0,.7);color:#fff;padding:.15rem .5rem;border-radius:4px;font-weight:700;font-size:.8rem}.gif-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out}.gif-overlay img{max-width:100vw;max-height:100vh}.vid video{width:100%}article img,video{max-width:100%;height:auto}article.fit-images img{max-width:100%!important;height:auto!important}.byline{color:var(--ion-color-medium)}audio{width:100%}.invert article{filter:invert(0.92) hue-rotate(180deg)}.loading{text-align:center;padding:3rem;color:var(--ion-color-medium)}.extract-error{color:var(--ion-color-warning-shade)}ion-button.active{--color:var(--ion-color-warning)}`],
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonSegment, IonSegmentButton, IonContent, IonSpinner],
})
export class ArticlePage implements OnInit {
  article = signal<Article | undefined>(undefined);
  mode = signal<ReadingMode>('feed');
  extracted = signal<string | undefined>(undefined);
  activeEmbed = signal<string | undefined>(undefined);
  gifOverlay = signal<string | undefined>(undefined);
  pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
  media = computed<MediaItem[]>(() => {
    const a = this.article();
    return a?.content ? extractMedia(a.content, a.link) : [];
  });
  thumb = youtubeThumbnail;
  extracting = signal(false);
  extractError = signal<string | undefined>(undefined);
  body = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(
    (this.mode() === 'simplified' && this.extracted()) || this.article()?.content || '<p>No article content was included in this feed.</p>'));

  constructor(private route: ActivatedRoute, private db: StoragePort, private http: FeedHttpService, private sanitizer: DomSanitizer, public prefs: ListPreferencesService, private tts: TtsService, private player: PodcastPlayerService) {
    addIcons({ shareOutline, star, starOutline, volumeHighOutline, globeOutline, textOutline, contrastOutline, imageOutline, headsetOutline, contractOutline });
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

  playEmbed(videoId: string) { this.activeEmbed.set(videoId); }
  embedUrl(item: MediaItem) { return item.type === 'youtube' ? this.sanitizer.bypassSecurityTrustResourceUrl(item.embedUrl) : ''; }
  async togglePip(video: HTMLVideoElement) {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch { /* PiP rejected (user gesture required or unsupported) */ }
  }
  async font(delta: number) { await this.prefs.setFontScale(this.prefs.fontScale() + delta); }
  async toggleStar() { const a = this.article(); if (!a) return; const starred = !a.starred; await this.db.updateArticle(a.id, { starred }); this.article.set({ ...a, starred }); }
  async share() { const a = this.article(); if (a) await Share.share({ title: a.title, text: a.title, url: a.link }); }
  async openWeb() { const url = this.article()?.link; if (url) await Browser.open({ url }); }
  async playAudio() {
    const a = this.article(); if (!a?.audio) return;
    await this.player.init();
    this.player.setQueueFromArticles([a]);
    await this.player.play(0);
  }

  speak() {
    const a = this.article(); if (!a) return;
    this.tts.setQueue([a]);
    this.tts.play(0);
  }
}
