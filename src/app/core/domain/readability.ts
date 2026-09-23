/** Readability-style main-content extraction for the article reading view. Pure DOM heuristics, no network. */

const STRIP = 'script, style, noscript, template, iframe, form, nav, header, footer, aside, button, svg, canvas, [hidden], [aria-hidden="true"], [role="navigation"], [role="banner"], [role="contentinfo"], .advertisement, .advert, .ads, .ad, .cookie, .newsletter, .related, .recommendations, .comments, .share, .social';

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
  const sentences = (el.textContent?.match(/[.!?](?:\s|$)/g) ?? []).length;
  const commas = (el.textContent?.match(/,/g) ?? []).length;
  const classHint = `${el.id} ${el.className}`.toLowerCase();
  const boost = /article|story|post|entry|content|body|main/.test(classHint) ? 1.3 : 1;
  const penalty = /comment|footer|sidebar|promo|related|share|social|nav/.test(classHint) ? 0.25 : 1;
  return (text + paragraphs * 140 + sentences * 18 + commas * 5) * Math.max(0, 1 - linkDensity(el)) * boost * penalty;
}

function cleanCandidate(el: Element): string {
  el.querySelectorAll(STRIP).forEach(node => node.remove());
  el.querySelectorAll('*').forEach(node => {
    for (const attr of [...node.attributes]) if (/^on/i.test(attr.name) || attr.name === 'style') node.removeAttribute(attr.name);
  });
  return el.innerHTML;
}

/** Extract the main article HTML from a full web page. Falls back to the body when nothing scores. */
export function extractMainContent(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(STRIP).forEach(el => el.remove());
  for (const selector of ['article', '[itemprop="articleBody"]', '.article-body', '.article__body', '.post-content', '.entry-content', 'main', '[role="main"]', '.article', '.post', '#content']) {
    const candidates = [...doc.querySelectorAll(selector)].sort((a, b) => score(b) - score(a));
    const el = candidates[0];
    if (el && (el.textContent?.trim().length ?? 0) > 200 && linkDensity(el) < .55) return cleanCandidate(el);
  }
  let best: Element | null = null;
  let bestScore = 0;
  for (const el of doc.body.querySelectorAll('div, section')) {
    const s = score(el);
    if (s > bestScore) { bestScore = s; best = el; }
  }
  if (best && ((best as Element).textContent?.trim().length ?? 0) > 100) return cleanCandidate(best as Element);
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
  doc.querySelectorAll('img').forEach(img => {
    const lazy = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
    if (!img.getAttribute('src') && lazy) img.setAttribute('src', lazy);
    fix(img, 'src');
    fix(img, 'srcset');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });
  doc.querySelectorAll('a').forEach(a => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener'); });
  return doc.body.innerHTML;
}
