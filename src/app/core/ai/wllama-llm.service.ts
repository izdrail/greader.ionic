import { Injectable, NgZone, signal } from '@angular/core';
import type { Wllama } from '@wllama/wllama/esm/index.js';
import { GenerateOptions, LlmAvailability, LlmError, LlmStatus, LocalLLMService } from './local-llm';
import { ChatMessage, DEFAULT_LOCAL_MODEL } from './summary-config';

/** Free the model after this long without use, so ~1 GB of memory is not held while the user just reads. */
const IDLE_UNLOAD_MS = 2 * 60_000;
/** WebAssembly SIMD probe (the wllama build requires SIMD). */
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

const quietLogger = { debug: () => undefined, log: () => undefined, warn: () => undefined, error: (...args: unknown[]) => console.error('[local-ai]', ...args) };

function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (error instanceof Error && (error.name === 'AbortError' || /abort/i.test(error.message)));
}

/**
 * wllama (llama.cpp compiled to WebAssembly) running Qwen3 0.6B inside a Web Worker.
 * - Model file: downloaded once from Hugging Face, cached in OPFS, loaded offline afterwards.
 * - Inference: WebGPU when the WebView has it, WASM SIMD on the CPU otherwise. Never on the UI thread.
 * - No article text leaves the device: the only network request is the model download.
 */
@Injectable({ providedIn: 'root' })
export class WllamaLlmService extends LocalLLMService {
  readonly model = DEFAULT_LOCAL_MODEL;
  readonly status = signal<LlmStatus>('unknown');
  readonly progress = signal<number | null>(null);
  private instance?: Wllama;
  private loading?: Promise<void>;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private availability?: LlmAvailability;

  constructor(private zone: NgZone) {
    super();
    if (typeof document !== 'undefined') {
      // Backgrounded app: release memory unless a summary is in flight (it finishes, then the idle timer frees it).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.status() === 'ready') void this.unload();
      });
    }
  }

  async checkAvailability(): Promise<LlmAvailability> {
    const base = this.availability ?? this.probeEnvironment();
    const downloaded = base.available ? await this.isDownloaded() : false;
    this.availability = { ...base, downloaded };
    if (['unknown', 'not-downloaded', 'downloaded', 'unavailable'].includes(this.status())) {
      this.status.set(!base.available ? 'unavailable' : downloaded ? 'downloaded' : 'not-downloaded');
    }
    return this.availability;
  }

  private probeEnvironment(): LlmAvailability {
    if (typeof WebAssembly !== 'object' || !WebAssembly.validate(SIMD_PROBE)) return { available: false, downloaded: false, reason: 'no-wasm' };
    if (typeof Worker === 'undefined') return { available: false, downloaded: false, reason: 'no-worker' };
    if (typeof navigator === 'undefined' || !navigator.storage?.getDirectory) return { available: false, downloaded: false, reason: 'no-storage' };
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (memory !== undefined && memory < 2) return { available: false, downloaded: false, reason: 'low-memory' };
    return { available: true, downloaded: false };
  }

  private async isDownloaded(): Promise<boolean> {
    try {
      const { CacheManager } = await import('@wllama/wllama/esm/index.js');
      const entries = await new CacheManager().list();
      return entries.some(e => e.metadata?.originalURL === this.model.url && e.size >= this.model.sizeBytes * 0.99);
    } catch { return false; }
  }

  load(signal?: AbortSignal): Promise<void> {
    this.clearIdle();
    if (this.instance?.isModelLoaded()) return Promise.resolve();
    this.loading ??= this.doLoad(signal).finally(() => { this.loading = undefined; });
    return this.loading;
  }

  private async doLoad(signal?: AbortSignal): Promise<void> {
    const availability = await this.checkAvailability();
    if (!availability.available) throw new LlmError('unavailable', availability.reason ?? 'unavailable');
    const { Wllama, CacheManager } = await import('@wllama/wllama/esm/index.js');
    const wasm = new URL('assets/wllama/wllama.wasm', document.baseURI).href;
    // wllama waits forever if its runtime can't be fetched; check it first so the user gets an error, not an endless spinner.
    const runtimeOk = await fetch(wasm).then(r => { void r.body?.cancel(); return r.ok; }).catch(() => false);
    if (!runtimeOk) { this.status.set('error'); throw new LlmError('download', 'wllama runtime unavailable'); }
    this.status.set(availability.downloaded ? 'loading' : 'downloading');
    this.progress.set(availability.downloaded ? null : 0);
    const progressCallback = ({ loaded, total }: { loaded: number; total: number }) => this.zone.run(() => {
      if (!total) return;
      this.progress.set(Math.min(1, loaded / total));
      if (loaded >= total) { this.status.set('loading'); this.progress.set(null); }
    });
    const attempt = async (gpu: boolean) => {
      const w = new Wllama({ default: wasm }, { logger: quietLogger, suppressNativeLog: true, allowOffline: true });
      try {
        const params = { n_ctx: this.model.contextTokens, n_gpu_layers: gpu ? undefined : 0 };
        // Already downloaded: load straight from OPFS so no network request is made at all (works offline).
        const cached = availability.downloaded ? await new CacheManager().open(this.model.url).catch(() => null) : null;
        if (cached) await w.loadModel([cached], params);
        else await w.loadModelFromUrl(this.model.url, { ...params, signal, progressCallback });
        return w;
      } catch (error) { await w.exit().catch(() => undefined); throw error; }
    };
    try {
      let w: Wllama;
      try { w = await attempt(true); }
      catch (error) {
        if (isAbort(error, signal)) throw error;
        // WebGPU drivers vary a lot on Android; the file is cached by now, so a CPU retry is cheap.
        w = await attempt(false);
      }
      this.instance = w;
      this.availability = { available: true, downloaded: true };
      this.status.set('ready');
      this.progress.set(null);
      this.scheduleIdle();
    } catch (error) {
      this.progress.set(null);
      if (isAbort(error, signal)) { this.status.set((await this.isDownloaded()) ? 'downloaded' : 'not-downloaded'); throw new LlmError('aborted'); }
      this.status.set('error');
      const downloaded = await this.isDownloaded();
      throw new LlmError(downloaded ? 'load' : 'download', error instanceof Error ? error.message : String(error));
    }
  }

  async generate(messages: ChatMessage[], options: GenerateOptions): Promise<string> {
    await this.load(options.signal);
    const w = this.instance;
    if (!w) throw new LlmError('load');
    this.clearIdle();
    this.status.set('generating');
    let text = '';
    try {
      const stream = await w.createChatCompletion({
        messages, max_tokens: options.maxTokens, temperature: options.temperature ?? 0.2, top_p: 0.9,
        stream: true, abortSignal: options.signal, chat_template_kwargs: { enable_thinking: false },
      });
      for await (const chunk of stream) {
        if (options.signal?.aborted) throw new LlmError('aborted');
        const delta = chunk.choices?.[0]?.delta?.content ?? '';
        if (!delta) continue;
        text += delta;
        options.onText?.(text);
      }
      return text;
    } catch (error) {
      if (error instanceof LlmError) throw error;
      if (isAbort(error, options.signal)) throw new LlmError('aborted');
      throw new LlmError('generation', error instanceof Error ? error.message : String(error));
    } finally {
      if (this.instance) { this.status.set('ready'); this.scheduleIdle(); }
    }
  }

  async unload(): Promise<void> {
    this.clearIdle();
    const w = this.instance;
    this.instance = undefined;
    if (w) await w.exit().catch(() => undefined);
    if (this.status() !== 'unavailable') this.status.set(this.availability?.downloaded ? 'downloaded' : 'not-downloaded');
  }

  async deleteModel(): Promise<void> {
    await this.unload();
    const { CacheManager } = await import('@wllama/wllama/esm/index.js');
    await new CacheManager().delete(this.model.url).catch(() => undefined);
    this.availability = undefined;
    await this.checkAvailability();
  }

  private scheduleIdle() { this.clearIdle(); this.idleTimer = setTimeout(() => { if (this.status() === 'ready') void this.unload(); }, IDLE_UNLOAD_MS); }
  private clearIdle() { if (this.idleTimer) clearTimeout(this.idleTimer); this.idleTimer = undefined; }
}
