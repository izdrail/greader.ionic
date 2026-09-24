import { Provider } from '@angular/core';
import { LocalLLMService } from './local-llm';
import { IndexedDbSummaryCache, SummaryCache } from './summary-cache';
import { WllamaLlmService } from './wllama-llm.service';

export const AI_PROVIDERS: Provider[] = [
  { provide: LocalLLMService, useExisting: WllamaLlmService },
  { provide: SummaryCache, useExisting: IndexedDbSummaryCache },
];
