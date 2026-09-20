import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { documentTextOutline, pauseOutline, playOutline, playBackOutline, playForwardOutline, playSkipBackOutline, playSkipForwardOutline, stopOutline, trashOutline, volumeHighOutline } from 'ionicons/icons';
import { StoragePort } from '../../core/storage/storage.port';
import { TtsService } from '../../core/services/tts.service';
import { PITCH_OPTIONS, RATE_OPTIONS } from '../../core/domain/tts';

@Component({
  selector: 'app-tts',
  template: `<ion-header><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/feeds"></ion-back-button></ion-buttons><ion-title>Voice reading</ion-title><ion-buttons slot="end"><ion-button aria-label="Stop" (click)="tts.stop()"><ion-icon name="stop-outline"></ion-icon></ion-button></ion-buttons></ion-toolbar></ion-header>
<ion-content>
  <div class="controls">
    <ion-button aria-label="Previous" (click)="tts.previous()" [disabled]="!tts.playing()"><ion-icon name="play-skip-back-outline"></ion-icon></ion-button>
    <ion-button aria-label="Rewind to start" (click)="restart()" [disabled]="!tts.playing()"><ion-icon name="play-back-outline"></ion-icon></ion-button>
    <ion-button [attr.aria-label]="tts.paused() || !tts.playing() ? 'Play' : 'Pause'" (click)="toggle()"><ion-icon [name]="tts.playing() && !tts.paused() ? 'pause-outline' : 'play-outline'"></ion-icon></ion-button>
    <ion-button aria-label="Next" (click)="tts.next()" [disabled]="!tts.playing()"><ion-icon name="play-skip-forward-outline"></ion-icon></ion-button>
    <ion-button aria-label="Forward within queue" (click)="tts.next()" [disabled]="!tts.playing()"><ion-icon name="play-forward-outline"></ion-icon></ion-button>
  </div>
  <ion-list inset>
    <ion-item><ion-select label="Voice" [value]="tts.prefs().voiceUri" (ionChange)="tts.setPrefs({voiceUri:$event.detail.value})"><ion-select-option [value]="null">System default</ion-select-option><ion-select-option *ngFor="let v of tts.voices()" [value]="v.voiceURI">{{v.name}} ({{v.lang}})</ion-select-option></ion-select></ion-item>
    <ion-item><ion-select label="Speed" [value]="tts.prefs().rate" (ionChange)="tts.setPrefs({rate:$event.detail.value})"><ion-select-option *ngFor="let r of rates" [value]="r">{{r}}x</ion-select-option></ion-select></ion-item>
    <ion-item><ion-select label="Pitch" [value]="tts.prefs().pitch" (ionChange)="tts.setPrefs({pitch:$event.detail.value})"><ion-select-option *ngFor="let p of pitches" [value]="p">{{p}}</ion-select-option></ion-select></ion-item>
  </ion-list>
  <ion-list>
    <ion-item *ngFor="let item of tts.queue(); let i = index" [class.playing]="i === tts.currentIndex()">
      <ion-icon slot="start" [name]="i === tts.currentIndex() && tts.playing() ? 'volume-high-outline' : 'document-text-outline'"></ion-icon>
      <ion-label><h2>{{item.title}}</h2><p>{{item.author}}</p></ion-label>
      <ion-button slot="end" fill="clear" [attr.aria-label]="'Play ' + item.title" (click)="tts.play(i)"><ion-icon name="play-outline"></ion-icon></ion-button>
      <ion-button slot="end" fill="clear" [attr.aria-label]="'Remove ' + item.title" (click)="tts.removeFromQueue(i)"><ion-icon name="trash-outline"></ion-icon></ion-button>
    </ion-item>
  </ion-list>
</ion-content>`,
  styles: [`.controls{display:flex;justify-content:center;gap:.25rem;padding:1rem}ion-item.playing{--background:var(--ion-color-primary-tint)}`],
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel, IonSelect, IonSelectOption],
})
export class TtsPage implements OnInit {
  rates = RATE_OPTIONS;
  pitches = PITCH_OPTIONS;

  constructor(private db: StoragePort, public tts: TtsService) {
    addIcons({ documentTextOutline, pauseOutline, playOutline, playBackOutline, playForwardOutline, playSkipBackOutline, playSkipForwardOutline, stopOutline, trashOutline, volumeHighOutline });
  }

  async ngOnInit() {
    await this.tts.init();
    if (!this.tts.queue().length) {
      const account = (await this.db.listAccounts())[0];
      if (account) this.tts.setQueue(await this.db.listArticles(account.id, { unreadOnly: true, limit: 100 }));
    }
  }

  toggle(): void {
    if (!this.tts.playing()) { if (this.tts.queue().length) this.tts.play(0); return; }
    this.tts.togglePause();
  }

  restart(): void {
    const current = this.tts.currentIndex();
    if (current >= 0) this.tts.play(current);
  }
}
