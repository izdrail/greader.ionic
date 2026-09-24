import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ToastController } from '@ionic/angular';
import { ArticleSummaryComponent } from './article-summary.component';
import { LocalLLMService, LlmError } from '../../core/ai/local-llm';
import { MemorySummaryCache, SummaryCache } from '../../core/ai/summary-cache';
import { ARTICLE_HTML, FakeLlm } from '../../core/ai/testing';

describe('ArticleSummaryComponent', () => {
  let llm: FakeLlm;
  let fixture: ComponentFixture<ArticleSummaryComponent>;
  let component: ArticleSummaryComponent;
  const toasts: string[] = [];
  const tick = () => new Promise(r => setTimeout(r));

  async function create(html = ARTICLE_HTML, enabled = true) {
    fixture = TestBed.createComponent(ArticleSummaryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('articleId', 'a1');
    fixture.componentRef.setInput('title', 'Budget plan');
    fixture.componentRef.setInput('html', html);
    fixture.componentRef.setInput('enabled', enabled);
    fixture.detectChanges();
    await fixture.whenStable(); await tick();
    fixture.detectChanges();
  }
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = (label: string) => [...(fixture.nativeElement as HTMLElement).querySelectorAll('ion-button')].find(b => b.textContent?.includes(label)) as HTMLElement | undefined;

  beforeEach(() => {
    llm = new FakeLlm();
    toasts.length = 0;
    TestBed.configureTestingModule({
      imports: [ArticleSummaryComponent],
      providers: [
        { provide: LocalLLMService, useValue: llm },
        { provide: SummaryCache, useValue: new MemorySummaryCache() },
        { provide: ToastController, useValue: { create: async (o: { message: string }) => ({ present: async () => { toasts.push(o.message); } }) } },
      ],
    });
  });

  it('shows the Summarise button when the device supports it', async () => {
    await create();
    expect(component.state()).toBe('idle');
    expect(button('Summarise with AI')).toBeTruthy();
  });

  it('hides the button when the device cannot run the model or the setting is off', async () => {
    llm.availability = { available: false, downloaded: false };
    await create();
    expect(component.state()).toBe('hidden');
    expect(button('Summarise with AI')).toBeUndefined();
    llm.availability = { available: true, downloaded: false };
    await create(ARTICLE_HTML, false);
    expect(component.state()).toBe('hidden');
  });

  it('shows preparing with download progress, then generating with streamed text and Cancel', async () => {
    await create();
    let release!: () => void;
    llm.gate = new Promise(r => { release = r; });
    const run = component.summarise();
    await tick();
    fixture.detectChanges();
    expect(component.state()).toBe('generating');
    expect(text()).toContain('Generating summary...');
    expect(button('Cancel')).toBeTruthy();
    release(); await run;
    fixture.detectChanges();
    expect(component.state()).toBe('done');
  });

  it('shows download progress while preparing', async () => {
    await create();
    component.state.set('preparing');
    llm.progress.set(0.37);
    fixture.detectChanges();
    expect(text()).toContain('Preparing AI summarisation...');
    expect(text()).toContain('Downloading model: 37%');
  });

  it('renders the finished summary safely with Regenerate and Copy', async () => {
    llm.tokens = ['The **vote** passed. <img src=x onerror=alert(1)>'];
    await create();
    await component.summarise();
    fixture.detectChanges();
    const body = (fixture.nativeElement as HTMLElement).querySelector('.summary-text')!;
    expect(body.querySelector('strong')?.textContent).toBe('vote');
    expect(body.querySelector('img')).toBeNull();
    expect(text()).toContain('Summarised locally on your device.');
    expect(button('Regenerate')).toBeTruthy();
    expect(button('Copy')).toBeTruthy();
  });

  it('cancel returns to the normal article state without an error', async () => {
    await create();
    let release!: () => void;
    llm.gate = new Promise(r => { release = r; });
    const run = component.summarise();
    await tick();
    component.cancel();
    release(); await run;
    fixture.detectChanges();
    expect(component.state()).toBe('idle');
    expect(component.error()).toBe('');
    expect(component.summary()).toBe('');
  });

  it('shows a friendly error and a retry for generation failures', async () => {
    await create();
    llm.generateError = new Error('RuntimeError: unreachable');
    await component.summarise();
    fixture.detectChanges();
    expect(component.state()).toBe('error');
    expect(text()).toContain("Couldn't generate the summary. Please try again.");
    expect(text()).not.toContain('RuntimeError');
    expect(button('Try again')).toBeTruthy();
  });

  it('shows the download error when the model cannot be prepared', async () => {
    await create();
    llm.loadError = new LlmError('download');
    await component.summarise();
    fixture.detectChanges();
    expect(text()).toContain("Couldn't prepare the AI model. Please try again.");
  });

  it('shows the not-enough-content message without a retry', async () => {
    await create('<p>Too short.</p>');
    await component.summarise();
    fixture.detectChanges();
    expect(text()).toContain("There isn't enough article content to summarise.");
    expect(button('Try again')).toBeUndefined();
  });

  it('regenerate runs the model again instead of using the cache', async () => {
    await create();
    await component.summarise();
    llm.tokens = ['A different summary of the budget vote.'];
    await component.regenerate();
    expect(component.summary()).toBe('A different summary of the budget vote.');
    expect(llm.calls.length).toBe(2);
  });

  it('shows a cached summary straight away on reopening the article', async () => {
    await create();
    await component.summarise();
    await create();
    expect(component.state()).toBe('done');
    expect(llm.calls.length).toBe(1);
  });

  it('copies the plain-text summary', async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => { writes.push(t); } } });
    await create();
    await component.summarise();
    await component.copy();
    expect(writes).toEqual(['The council approved the new plan on Monday.']);
    expect(toasts).toContain('Summary copied');
  });
});
