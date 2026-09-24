import { Component, Input, OnChanges, OnDestroy, SimpleChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonButton, IonCard, IonCardContent, IonIcon, IonProgressBar, IonSpinner, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { copyOutline, refreshOutline, sparklesOutline } from 'ionicons/icons';
import { ArticleSummarisationService, SummaryError, SUMMARY_ERROR_MESSAGES } from '../../core/ai/article-summarisation.service';
import { summaryMarkdownToHtml, summaryMarkdownToText } from '../../core/ai/summary-markdown';

export type SummaryUiState = 'hidden' | 'idle' | 'preparing' | 'generating' | 'done' | 'error';

/**
 * "Summarise with AI" for one article: button, model preparation, streamed summary, cancel, result card.
 * Knows nothing about the model; everything goes through ArticleSummarisationService.
 */
@Component({
  selector: 'app-article-summary',
  imports: [CommonModule, IonButton, IonCard, IonCardContent, IonIcon, IonProgressBar, IonSpinner],
  template: `
    <ion-button *ngIf="state()==='idle'" class="summarise" fill="outline" size="small" (click)="summarise()"><ion-icon name="sparkles-outline" slot="start"></ion-icon>Summarise with AI</ion-button>
    <ion-card *ngIf="state()!=='idle' && state()!=='hidden'" class="summary-card">
      <ion-card-content>
        <ng-container *ngIf="state()==='preparing'">
          <p class="status"><ion-spinner name="dots"></ion-spinner> Preparing AI summarisation...</p>
          <ng-container *ngIf="progress() as p"><p class="detail">Downloading model: {{ p * 100 | number:'1.0-0' }}% <span class="muted">(one time, {{ modelSizeMb }} MB)</span></p><ion-progress-bar [value]="p"></ion-progress-bar></ng-container>
          <ion-progress-bar *ngIf="!progress()" type="indeterminate"></ion-progress-bar>
        </ng-container>
        <ng-container *ngIf="state()==='generating'">
          <p class="status"><ion-spinner name="dots"></ion-spinner> {{ partLabel() || 'Generating summary...' }}</p>
          <div class="summary-text" *ngIf="partial()" [innerHTML]="partialHtml()"></div>
        </ng-container>
        <ng-container *ngIf="state()==='done'">
          <p class="label"><ion-icon name="sparkles-outline"></ion-icon> AI summary</p>
          <div class="summary-text" [innerHTML]="summaryHtml()"></div>
          <p class="privacy">Summarised locally on your device. AI can make mistakes.</p>
        </ng-container>
        <p class="error" *ngIf="state()==='error'">{{ error() }}</p>
        <div class="actions">
          <ion-button *ngIf="state()==='preparing' || state()==='generating'" size="small" fill="clear" (click)="cancel()">Cancel</ion-button>
          <ng-container *ngIf="state()==='done'">
            <ion-button size="small" fill="clear" (click)="regenerate()"><ion-icon name="refresh-outline" slot="start"></ion-icon>Regenerate</ion-button>
            <ion-button size="small" fill="clear" (click)="copy()"><ion-icon name="copy-outline" slot="start"></ion-icon>Copy</ion-button>
          </ng-container>
          <ng-container *ngIf="state()==='error'">
            <ion-button *ngIf="retryable()" size="small" fill="clear" (click)="summarise(true)"><ion-icon name="refresh-outline" slot="start"></ion-icon>Try again</ion-button>
            <ion-button size="small" fill="clear" (click)="reset()">Close</ion-button>
          </ng-container>
        </div>
      </ion-card-content>
    </ion-card>`,
  styles: [`:host{display:block;margin:0 0 1rem}.summary-card{margin:0;box-shadow:none;border:1px solid var(--ion-color-step-150,#ddd);border-left:3px solid var(--ion-color-primary)}ion-card-content{padding:.75rem 1rem .25rem}.status,.label{display:flex;align-items:center;gap:.4rem;margin:0 0 .5rem;color:var(--ion-color-medium);font-size:.85rem}.label{font-weight:600;color:var(--ion-color-primary)}.detail{margin:0 0 .4rem;font-size:.85rem}.muted,.privacy{color:var(--ion-color-medium)}.privacy{font-size:.75rem;margin:.5rem 0 0}.summary-text{color:var(--ion-text-color);font-size:.95rem;line-height:1.5}.summary-text p{margin:0 0 .5rem}.summary-text ul,.summary-text ol{margin:0 0 .5rem;padding-left:1.2rem}.error{color:var(--ion-color-danger);margin:0 0 .25rem}.actions{display:flex;flex-wrap:wrap;justify-content:flex-end}`],
})
export class ArticleSummaryComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) articleId!: string;
  @Input() title?: string;
  /** The HTML currently shown (feed or Reading content). */
  @Input() html?: string;
  @Input() enabled = true;

  private service = inject(ArticleSummarisationService);
  private toasts = inject(ToastController);
  readonly state = signal<SummaryUiState>('hidden');
  readonly partial = signal('');
  readonly summary = signal('');
  readonly error = signal('');
  readonly retryable = signal(false);
  readonly partLabel = signal('');
  readonly progress = computed(() => this.state() === 'preparing' ? this.service.progress() : null);
  readonly partialHtml = computed(() => summaryMarkdownToHtml(this.partial()));
  readonly summaryHtml = computed(() => summaryMarkdownToHtml(this.summary()));
  readonly modelSizeMb = Math.round(this.service.model.sizeBytes / 1_048_576);
  private controller?: AbortController;
  /** Each run gets an id; output from a cancelled or superseded run is ignored. */
  private run = 0;

  constructor() { addIcons({ copyOutline, refreshOutline, sparklesOutline }); }

  async ngOnChanges(changes: SimpleChanges) {
    if (!changes['articleId'] && !changes['html'] && !changes['enabled']) return;
    this.cancel();
    const run = ++this.run;
    if (!this.enabled || !this.articleId) { this.state.set('hidden'); return; }
    const available = await this.service.isAvailable().catch(() => false);
    if (run !== this.run) return;
    if (!available) { this.state.set('hidden'); return; }
    const hit = await this.service.cached({ articleId: this.articleId, title: this.title, html: this.html }).catch(() => undefined);
    if (run !== this.run) return;
    if (hit) { this.summary.set(hit.summary); this.state.set('done'); } else this.state.set('idle');
  }

  async summarise(force = false) {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const run = ++this.run;
    const live = () => run === this.run && !controller.signal.aborted;
    this.partial.set(''); this.error.set(''); this.partLabel.set('');
    this.state.set('generating');
    try {
      const result = await this.service.summarise({ articleId: this.articleId, title: this.title, html: this.html }, {
        signal: controller.signal, force,
        onPhase: (p) => {
          if (!live()) return;
          this.state.set(p.phase);
          this.partLabel.set(p.phase === 'generating' && p.parts ? (p.part === p.parts ? 'Combining summary...' : `Summarising part ${p.part} of ${p.parts - 1}...`) : '');
        },
        onPartial: (text) => { if (live()) this.partial.set(text); },
      });
      if (!live()) return;
      this.summary.set(result.summary);
      this.state.set('done');
    } catch (e) {
      if (!live()) return;
      const code = e instanceof SummaryError ? e.code : 'generation';
      if (code === 'cancelled') { this.reset(); return; }
      this.error.set(SUMMARY_ERROR_MESSAGES[code]);
      this.retryable.set(code === 'download' || code === 'generation');
      this.state.set('error');
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }

  regenerate() { return this.summarise(true); }

  /** Stop the model and go back to the normal article, without an error. */
  cancel() {
    if (!this.controller) return;
    this.controller.abort();
    this.controller = undefined;
    this.run++;
    this.reset();
  }

  reset() {
    this.partial.set(''); this.error.set(''); this.partLabel.set('');
    this.state.set('idle');
  }

  async copy() {
    const text = summaryMarkdownToText(this.summary());
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
    const toast = await this.toasts.create({ message: ok ? 'Summary copied' : "Couldn't copy the summary", duration: 1800, position: 'bottom' });
    await toast.present();
  }

  ngOnDestroy() {
    this.controller?.abort();
    this.run++;
    void this.service.release();
  }
}
