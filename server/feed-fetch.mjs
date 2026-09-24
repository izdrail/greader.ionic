import { Agent, fetch } from 'undici';
import { toUtf8 } from './charset.mjs';
import { FeedPolicyError, MAX_FEED_BYTES, FETCH_TIMEOUT_MS, MAX_REDIRECTS, allowedContentType, parsePublicHttpUrl, resolvePublic } from './feed-policy.mjs';

export class FeedUpstreamError extends Error {
  constructor(message, options) { super(message, options); this.name = 'FeedUpstreamError'; this.code = 'upstream_failure'; }
}

export function pinnedLookup(record) {
  return (_host, options, callback) => {
    // Undici requests all addresses on recent Node versions. Returning a scalar
    // in that mode produces ERR_INVALID_IP_ADDRESS before any HTTP request.
    if (options?.all) callback(null, [{ address: record.address, family: record.family }]);
    else callback(null, record.address, record.family);
  };
}

export async function fetchFeed(raw, dependencies = {}) {
  const request = dependencies.fetch ?? fetch;
  const resolve = dependencies.resolve ?? resolvePublic;
  let url = parsePublicHttpUrl(raw);
  try {
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const record = await resolve(url);
    const dispatcher = dependencies.dispatcher?.(record, url) ?? new Agent({ connect: { lookup: pinnedLookup(record) } });
    let response;
    try {
      response = await request(url, { method: 'GET', headers: { accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1', 'user-agent': 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 gReaderNews/0.0.1' }, redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), dispatcher });
      if ([301,302,303,307,308].includes(response.status)) {
        if (redirects === MAX_REDIRECTS) throw new Error('Too many feed redirects');
        const location = response.headers.get('location'); if (!location) throw new Error('Feed redirect has no location');
        url = parsePublicHttpUrl(new URL(location, url).toString()); continue;
      }
      if (!response.ok) throw new Error(`Feed upstream returned ${response.status}`);
      const declared = Number(response.headers.get('content-length') || 0); if (declared > MAX_FEED_BYTES) throw new Error('Feed exceeds 5 MB');
      const type = response.headers.get('content-type') || ''; if (type && !allowedContentType(type)) throw new Error('Upstream response is not a feed');
      const reader = response.body.getReader(); const chunks = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('Feed exceeds 5 MB'); } chunks.push(value); }
      const decoded = toUtf8(Buffer.concat(chunks.map((x) => Buffer.from(x))), type || 'application/xml');
        return { body: decoded.body, contentType: decoded.contentType, finalUrl: url.toString() };
    } finally { if (!dependencies.dispatcher && dispatcher?.close) await dispatcher.close(); }
  }
  throw new Error('Feed could not be fetched');
  } catch (error) {
    if (error instanceof FeedPolicyError || error instanceof FeedUpstreamError) throw error;
    throw new FeedUpstreamError(error instanceof Error ? error.message : 'Feed fetch failed', { cause: error });
  }
}
