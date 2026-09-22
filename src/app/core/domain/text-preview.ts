/**
 * Plain-text previews for the article list. Feed content is HTML; the list and
 * card views must never show raw markup, so every snippet/title passes through
 * here first. The article detail view renders the same HTML intentionally and
 * does not use this.
 */

/** Convert feed HTML to clean human-readable text: tags removed, entities decoded, whitespace collapsed. */
export function htmlToText(html: string | undefined | null): string {
  if (!html) return '';
  // Block boundaries become spaces so "Intro</p><p>Next" reads as "Intro Next".
  const spaced = html
    .replace(/<br[^>]*>/gi, ' ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|table|section|article|blockquote|pre|figure|header|footer)>/gi, ' ');
  let text: string;
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(spaced, 'text/html');
    doc.querySelectorAll('script,style,noscript,template').forEach(node => node.remove());
    text = doc.body.textContent ?? '';
  } else {
    text = decodeEntities(spaced.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' '));
  }
  return text.replace(/\s+/g, ' ').trim();
}

/** Entity decoding for the no-DOM fallback path; DOMParser already decodes when present. */
function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/** A single-line preview capped at max characters on a word boundary, or '' when there is nothing worth showing. */
export function snippet(html: string | undefined | null, max = 180): string {
  const text = htmlToText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > max * 0.5 ? boundary : max).trimEnd()}…`;
}
