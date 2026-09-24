/**
 * Article text for AI summaries: untrusted feed/extracted HTML in, clean plain text out.
 * Pipeline: sanitize -> strip page noise -> block-aware text -> normalised whitespace.
 * The model never sees markup.
 */
import { sanitizeArticleHtml } from '../domain/html-safety';
import { stripPageNoise } from '../domain/readability';

const BLOCKS = 'p, div, li, h1, h2, h3, h4, h5, h6, blockquote, pre, tr, section, article, figure, figcaption, header, footer, dd, dt';
/** Captions, credits and bylines add nothing to a summary and confuse small models. */
const NOISE_BLOCKS = 'figcaption, picture, img, video, audio, source, [class*="caption" i], [class*="credit" i]';

/** Clean plain text with paragraph breaks ("\n\n") kept, or '' when nothing readable is left. */
export function articleTextForSummary(html: string | undefined | null): string {
  if (!html?.trim()) return '';
  const doc = new DOMParser().parseFromString(sanitizeArticleHtml(html), 'text/html');
  const root = doc.body;
  stripPageNoise(root);
  root.querySelectorAll(NOISE_BLOCKS).forEach(node => node.remove());
  root.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  root.querySelectorAll('li').forEach(li => li.prepend('- '));
  root.querySelectorAll(BLOCKS).forEach(block => { block.prepend('\n\n'); block.append('\n\n'); });
  return normaliseWhitespace(root.textContent ?? '');
}

/** Collapse runs of spaces inside lines and keep at most one blank line between paragraphs. */
export function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v\u00a0\u2000-\u200b\u202f\u205f\u3000 ]+/g, ' ')
    .split('\n').map(line => line.trim()).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Stable 53-bit content hash (cyrb53) as hex - cheap, synchronous and good enough to spot a changed article. */
export function contentHash(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
