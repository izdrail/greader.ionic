import { SUMMARY_LIMITS } from './summary-config';

export type SummaryPlan =
  | { kind: 'insufficient' }
  | { kind: 'direct'; text: string }
  | { kind: 'chunked'; chunks: string[] }
  | { kind: 'too-large'; chunks: number };

/** Decide how an article's text reaches the model, before any model work starts. */
export function planSummary(text: string, limits = SUMMARY_LIMITS): SummaryPlan {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (text.length < limits.minChars || words < 40) return { kind: 'insufficient' };
  if (text.length <= limits.chunkChars) return { kind: 'direct', text };
  const chunks = chunkText(text, limits.chunkChars);
  if (chunks.length > limits.maxChunks) return { kind: 'too-large', chunks: chunks.length };
  return { kind: 'chunked', chunks };
}

/**
 * Split text into chunks of at most maxChars, breaking only between paragraphs where possible,
 * then between sentences, and only mid-sentence for a single sentence longer than maxChars.
 */
export function chunkText(text: string, maxChars: number): string[] {
  const pieces: string[] = [];
  for (const paragraph of text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)) {
    if (paragraph.length <= maxChars) { pieces.push(paragraph); continue; }
    for (const sentence of paragraph.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [paragraph]) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length <= maxChars) pieces.push(s);
      else for (let i = 0; i < s.length; i += maxChars) pieces.push(s.slice(i, i + maxChars));
    }
  }
  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const joined = current ? `${current}\n\n${piece}` : piece;
    if (joined.length <= maxChars) { current = joined; continue; }
    if (current) chunks.push(current);
    current = piece;
  }
  if (current) chunks.push(current);
  return balance(chunks, maxChars);
}

/** A tiny trailing chunk wastes a model pass: fold it into the previous one when that still fits. */
function balance(chunks: string[], maxChars: number): string[] {
  if (chunks.length < 2) return chunks;
  const last = chunks[chunks.length - 1];
  const prev = chunks[chunks.length - 2];
  if (last.length < maxChars * 0.15 && prev.length + last.length + 2 <= maxChars * 1.15) {
    return [...chunks.slice(0, -2), `${prev}\n\n${last}`];
  }
  return chunks;
}
