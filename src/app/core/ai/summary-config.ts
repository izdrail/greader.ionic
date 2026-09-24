/**
 * Summary configuration: model, prompt and limits live here so they can change without touching the article UI.
 */

/** The summary shapes the browser Summarizer API uses. V1 only exposes the default. */
export type SummaryType = 'tldr' | 'key-points' | 'headline' | 'teaser';
export type SummaryLength = 'short' | 'medium' | 'long';
export type SummaryFormat = 'markdown' | 'plain-text';

export interface SummaryOptions { type: SummaryType; length: SummaryLength; format: SummaryFormat; }

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = { type: 'tldr', length: 'short', format: 'markdown' };

export interface LocalModelConfig {
  /** Part of the cache key: a new model means new summaries. */
  id: string;
  label: string;
  url: string;
  sizeBytes: number;
  /** Context window we open the model with (the model itself supports more; memory is the limit on phones). */
  contextTokens: number;
  license: string;
}

/**
 * Qwen3 0.6B, Q4_K_M quantisation, Apache-2.0. Pinned to a Hugging Face revision so the download never changes
 * under a cached summary. 378 MB, downloaded once and kept in the browser's private file storage (OPFS).
 */
export const DEFAULT_LOCAL_MODEL: LocalModelConfig = {
  id: 'qwen3-0.6b-q4_k_m',
  label: 'Qwen3 0.6B',
  url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/50968a4468ef4233ed78cd7c3de230dd1d61a56b/Qwen3-0.6B-Q4_K_M.gguf',
  sizeBytes: 396_705_472,
  contextTokens: 4096,
  license: 'Apache-2.0',
};

/**
 * Length limits, in characters (roughly 3.5-4 characters per token for English news text).
 * - below minChars there is nothing worth summarising
 * - up to chunkChars the article goes to the model in one pass
 * - longer articles are split at paragraph boundaries into chunks, summarised, then combined (map/reduce)
 * - beyond maxChunks the article is too large to summarise in reasonable time and memory on a phone
 */
export const SUMMARY_LIMITS = { minChars: 280, chunkChars: 5000, maxChunks: 4 };

const MAX_TOKENS: Record<SummaryLength, number> = { short: 180, medium: 300, long: 450 };
export function maxTokensFor(options: SummaryOptions): number { return MAX_TOKENS[options.length]; }

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

const BASE_RULES = [
  'Only include information contained in the article.',
  'Do not invent facts, opinions or conclusions, and do not add outside information.',
  'Focus on the main story and the important facts, names, dates and numbers.',
  'Write for a reader on a phone deciding whether to read the full article.',
];

const SHAPE: Record<SummaryType, Record<SummaryLength, string>> = {
  'tldr': { short: 'Write a TL;DR of 2-3 short sentences.', medium: 'Write a TL;DR of one short paragraph.', long: 'Write a TL;DR of two short paragraphs.' },
  'key-points': { short: 'Write 3 bullet points, one line each.', medium: 'Write 5 bullet points, one line each.', long: 'Write 7 bullet points, one line each.' },
  'headline': { short: 'Write a single headline of at most 12 words.', medium: 'Write a single headline of at most 18 words.', long: 'Write a single headline of at most 24 words.' },
  'teaser': { short: 'Write one intriguing sentence that makes a reader want to open the article.', medium: 'Write two intriguing sentences.', long: 'Write a short intriguing paragraph.' },
};

function formatRule(format: SummaryFormat): string {
  return format === 'markdown'
    ? 'Use plain Markdown only (short paragraphs, "- " bullets, **bold** for at most a few key terms). No headings, no preamble.'
    : 'Use plain text only. No Markdown, no headings, no preamble.';
}

/** System + user messages for summarising one article (or one chunk of it). */
export function buildSummaryMessages(text: string, title: string | undefined, options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS): ChatMessage[] {
  return [
    { role: 'system', content: ['Create a concise news summary of the supplied article.', ...BASE_RULES, SHAPE[options.type][options.length], formatRule(options.format)].join('\n') },
    { role: 'user', content: `${title ? `Title: ${title}\n\n` : ''}Article:\n${text}` },
  ];
}

/** Map step for long articles: summarise one part without concluding anything about the parts not shown. */
export function buildChunkMessages(chunk: string, index: number, total: number, title: string | undefined): ChatMessage[] {
  return [
    { role: 'system', content: [`You are summarising part ${index + 1} of ${total} of a longer news article.`, ...BASE_RULES, 'Write 2-4 short plain-text sentences covering only this part. No preamble.'].join('\n') },
    { role: 'user', content: `${title ? `Title: ${title}\n\n` : ''}Part ${index + 1} of ${total}:\n${chunk}` },
  ];
}

/** Reduce step: combine the part summaries into the final summary in the requested shape. */
export function buildCombineMessages(partials: string[], title: string | undefined, options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS): ChatMessage[] {
  return [
    { role: 'system', content: ['Combine these partial summaries of one news article into a single concise summary.', ...BASE_RULES, 'Remove repetition.', SHAPE[options.type][options.length], formatRule(options.format)].join('\n') },
    { role: 'user', content: `${title ? `Title: ${title}\n\n` : ''}${partials.map((p, i) => `Part ${i + 1}: ${p}`).join('\n\n')}` },
  ];
}
