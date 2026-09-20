export type MediaItem =
  | { type: 'youtube'; videoId: string; embedUrl: string; originalUrl: string }
  | { type: 'gif'; url: string }
  | { type: 'video'; url: string };

/** YouTube video id from watch, youtu.be, shorts, live or embed URLs; null for non-YouTube input. */
export function parseYouTubeId(url: string): string | null {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return null; }
  const host = parsed.hostname.replace(/^(www\.|m\.)/, '');
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return isVideoId(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id && isVideoId(id) ? id : null;
    }
    const match = /^\/(shorts|live|embed|v)\/([^/?#]+)/.exec(parsed.pathname);
    if (match && isVideoId(match[2])) return match[2];
  }
  return null;
}

function isVideoId(value: string): boolean {
  return /^[\w-]{6,20}$/.test(value);
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function isGifUrl(url: string): boolean {
  return /\.gif($|[?#])/i.test(url);
}

function absolute(url: string, base?: string): string {
  try { return base ? new URL(url, base).toString() : url; } catch { return url; }
}

/** Detect GIF images, YouTube embeds/links and video elements inside article HTML. */
export function extractMedia(contentHtml: string, baseUrl?: string): MediaItem[] {
  const doc = new DOMParser().parseFromString(contentHtml, 'text/html');
  const items: MediaItem[] = [];
  const seen = new Set<string>();

  doc.querySelectorAll('iframe[src]').forEach(el => {
    const src = absolute(el.getAttribute('src') ?? '', baseUrl);
    const id = parseYouTubeId(src);
    if (id && !seen.has(id)) { seen.add(id); items.push({ type: 'youtube', videoId: id, embedUrl: youtubeEmbedUrl(id), originalUrl: src }); }
  });
  doc.querySelectorAll('a[href]').forEach(el => {
    const href = absolute(el.getAttribute('href') ?? '', baseUrl);
    const id = parseYouTubeId(href);
    if (id && !seen.has(id)) { seen.add(id); items.push({ type: 'youtube', videoId: id, embedUrl: youtubeEmbedUrl(id), originalUrl: href }); }
  });
  doc.querySelectorAll('img[src]').forEach(el => {
    const src = absolute(el.getAttribute('src') ?? '', baseUrl);
    if (isGifUrl(src) && !seen.has(src)) { seen.add(src); items.push({ type: 'gif', url: src }); }
  });
  doc.querySelectorAll('video').forEach(el => {
    const src = el.getAttribute('src') ?? el.querySelector('source')?.getAttribute('src') ?? '';
    if (src) {
      const url = absolute(src, baseUrl);
      if (!seen.has(url)) { seen.add(url); items.push({ type: 'video', url }); }
    }
  });
  return items;
}
