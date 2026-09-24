import { signal } from '@angular/core';
import { GenerateOptions, LlmAvailability, LlmError, LlmStatus, LocalLLMService } from './local-llm';
import { ChatMessage, DEFAULT_LOCAL_MODEL } from './summary-config';

/** Scriptable LocalLLMService for tests: no model, no network. */
export class FakeLlm extends LocalLLMService {
  readonly model = DEFAULT_LOCAL_MODEL;
  readonly status = signal<LlmStatus>('unknown');
  readonly progress = signal<number | null>(null);
  availability: LlmAvailability = { available: true, downloaded: false };
  loadError?: LlmError;
  generateError?: Error;
  /** Tokens streamed per generate call; the default is a plausible summary. */
  tokens: string[] = ['The council ', 'approved the ', '**new plan** on Monday.'];
  loads = 0; unloads = 0; deletes = 0;
  calls: ChatMessage[][] = [];
  /** When set, generate waits for this before streaming (lets tests cancel mid-flight). */
  gate?: Promise<void>;
  loaded = false;

  async checkAvailability() { return this.availability; }
  async load(signal?: AbortSignal) {
    this.loads++;
    if (signal?.aborted) throw new LlmError('aborted');
    if (this.loadError) throw this.loadError;
    if (!this.availability.downloaded) { this.progress.set(0.5); this.status.set('downloading'); }
    this.loaded = true; this.availability = { ...this.availability, downloaded: true };
    this.status.set('ready'); this.progress.set(null);
  }
  async generate(messages: ChatMessage[], options: GenerateOptions) {
    this.calls.push(messages);
    this.status.set('generating');
    try {
      if (this.gate) await this.gate;
      if (options.signal?.aborted) throw new LlmError('aborted');
      if (this.generateError) throw this.generateError;
      let text = '';
      for (const t of this.tokens) { text += t; options.onText?.(text); }
      return text;
    } finally { this.status.set('ready'); }
  }
  async unload() { this.unloads++; this.loaded = false; this.status.set('downloaded'); }
  async deleteModel() { this.deletes++; this.availability = { ...this.availability, downloaded: false }; }
}

export const LONG_PARAGRAPH = Array.from({ length: 12 }, (_, i) => `Council member ${i} said the budget plan would change local services from next April.`).join(' ');
export const ARTICLE_HTML = `<p>${LONG_PARAGRAPH}</p><p>${LONG_PARAGRAPH}</p>`;
