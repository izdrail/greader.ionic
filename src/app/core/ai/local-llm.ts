import { Signal } from '@angular/core';
import { ChatMessage, LocalModelConfig } from './summary-config';

/**
 * Lifecycle of the on-device model, as the UI sees it.
 * downloaded = on disk, not in memory. ready = in memory, idle.
 */
export type LlmStatus = 'unknown' | 'unavailable' | 'not-downloaded' | 'downloaded' | 'downloading' | 'loading' | 'ready' | 'generating' | 'error';

export interface LlmAvailability { available: boolean; downloaded: boolean; reason?: 'no-wasm' | 'no-worker' | 'no-storage' | 'low-memory'; }

export type LlmErrorCode = 'unavailable' | 'download' | 'load' | 'generation' | 'aborted';

/** Errors from the provider carry a code; the message is for logs only and never shown to users. */
export class LlmError extends Error {
  constructor(public readonly code: LlmErrorCode, message: string = code) { super(message); this.name = 'LlmError'; }
}

export interface GenerateOptions {
  maxTokens: number;
  temperature?: number;
  signal?: AbortSignal;
  /** Called with the full text generated so far, after each streamed token. */
  onText?: (text: string) => void;
}

/**
 * Local (on-device) text generation. The app only talks to this abstraction; the provider behind it
 * (wllama/llama.cpp today) can change without touching summarisation or UI code.
 */
export abstract class LocalLLMService {
  abstract readonly status: Signal<LlmStatus>;
  /** Download progress 0..1 while downloading, otherwise null. */
  abstract readonly progress: Signal<number | null>;
  abstract readonly model: LocalModelConfig;
  abstract checkAvailability(): Promise<LlmAvailability>;
  /** Download (first time only) and load the model. Concurrent calls share one load; a loaded model is reused. */
  abstract load(signal?: AbortSignal): Promise<void>;
  abstract generate(messages: ChatMessage[], options: GenerateOptions): Promise<string>;
  /** Free the model's memory. The downloaded file stays for offline use. */
  abstract unload(): Promise<void>;
  /** Unload and delete the downloaded model file. */
  abstract deleteModel(): Promise<void>;
}
