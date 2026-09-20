/** Readability-style main-content extraction for the article reading view. Pure DOM heuristics, no network. */

const STRIP = 'script, style, noscript, iframe, form, nav, header, footer, aside, [role="navigation"], [role="banner"], [role="contentinfo"]';

function linkDensity(el: Element): number {
  const text = el.textContent?.length ?? 0;
  if (!text) return 1;
  let linked = 0;
  el.querySelectorAll('a').forEach(a => { linked += a.textContent?.length ?? 0; });
  return linked / text;
}

function score(el: Element): number {
  const text = el.textContent?.trim().length ?? 0;
  const paragraphs = el.querySelectorAll('p').length;
  return (text + paragraphs * 120) * (1 - linkDensity(el));
}

/** Extract the main article HTML from a full web page. Falls back to the body when nothing scores. */
export function extractMainContent(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(STRIP).forEach(el => el.remove());
  for (const selector of ['article', 'main', '[role="main"]', '.article', '.post', '.entry-content', '#content']) {
    const el = doc.querySelector(selector);
    if (el && (el.textContent?.trim().length ?? 0) > 200) return el.innerHTML;
  }
  let best: Element | null = null;
  let bestScore = 0;
  for (const el of doc.body.querySelectorAll('div, section')) {
    const s = score(el);
    if (s > bestScore) { bestScore = s; best = el; }
  }
  if (best && ((best as Element).textContent?.trim().length ?? 0) > 100) return (best as Element).innerHTML;
  return doc.body.innerHTML;
}

/** Resolve relative links and image sources against the page URL so the reading view stays usable. */
export function absolutizeUrls(html: string, baseUrl: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const fix = (el: Element, attr: string) => {
    const value = el.getAttribute(attr);
    if (!value || value.startsWith('data:')) return;
    try { el.setAttribute(attr, new URL(value, baseUrl).toString()); } catch { /* keep original */ }
  };
  doc.querySelectorAll('a').forEach(a => fix(a, 'href'));
  doc.querySelectorAll('img, video, audio, source').forEach(el => fix(el, 'src'));
  doc.querySelectorAll('a').forEach(a => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); });
  return doc.body.innerHTML;
}
