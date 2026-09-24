/**
 * Feeds and pages that declare a non-UTF-8 charset (ISO-8859-x, windows-125x, Shift_JIS, GB2312 ...)
 * only in the XML prolog or a <meta> tag get decoded as UTF-8 by the browser and show mojibake.
 * Transcode them to UTF-8 on the proxy and say so in the Content-Type.
 */
const PROLOG = /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([A-Za-z0-9._:-]+)["']/i;
const META = /<meta[^>]+charset\s*=\s*["']?([A-Za-z0-9._:-]+)/i;

export function declaredCharset(contentType, head) {
  const header = /charset\s*=\s*"?([A-Za-z0-9._:-]+)/i.exec(contentType || '');
  if (header) return header[1].toLowerCase();
  const inBody = PROLOG.exec(head) || META.exec(head);
  return inBody ? inBody[1].toLowerCase() : undefined;
}

export function toUtf8(body, contentType) {
  const bytes = Buffer.from(body);
  const head = bytes.subarray(0, 2048).toString('latin1');
  const charset = declaredCharset(contentType, head);
  const base = (contentType || 'application/xml').split(';')[0].trim() || 'application/xml';
  if (!charset || charset === 'utf-8' || charset === 'utf8' || charset === 'us-ascii') {
    return { body: bytes, contentType: `${base}; charset=utf-8` };
  }
  let decoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    return { body: bytes, contentType: contentType || base }; // unknown label: pass through untouched
  }
  let text = decoder.decode(bytes);
  // The prolog/meta would now lie about the encoding; rewrite it so an XML parser doesn't re-decode.
  text = text.replace(PROLOG, (m, enc) => m.replace(enc, 'UTF-8')).replace(META, (m, enc) => m.replace(enc, 'utf-8'));
  return { body: Buffer.from(text, 'utf8'), contentType: `${base}; charset=utf-8` };
}
