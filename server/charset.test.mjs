import { describe, it, expect } from 'vitest';
import { declaredCharset, toUtf8 } from './charset.mjs';

describe('charset', () => {
  it('prefers the Content-Type charset, then the XML prolog, then a meta tag', () => {
    expect(declaredCharset('text/xml; charset=ISO-8859-1', '<?xml version="1.0" encoding="utf-8"?>')).toBe('iso-8859-1');
    expect(declaredCharset('application/rss+xml', '<?xml version="1.0" encoding="windows-1252"?><rss/>')).toBe('windows-1252');
    expect(declaredCharset('text/html', '<html><head><meta charset="Shift_JIS">')).toBe('shift_jis');
    expect(declaredCharset('application/xml', '<rss/>')).toBeUndefined();
  });

  it('transcodes a latin-1 feed declared only in the prolog to UTF-8 and fixes the prolog', () => {
    const latin1 = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><rss><title>Caf\xe9 d\xe9j\xe0 vu</title></rss>', 'latin1');
    const out = toUtf8(latin1, 'application/rss+xml');
    expect(out.contentType).toBe('application/rss+xml; charset=utf-8');
    const text = out.body.toString('utf8');
    expect(text).toContain('Café déjà vu');
    expect(text).toContain('encoding="UTF-8"');
  });

  it('leaves UTF-8 bytes alone and labels them', () => {
    const out = toUtf8(Buffer.from('<rss><title>Café</title></rss>'), 'application/xml');
    expect(out.body.toString('utf8')).toContain('Café');
    expect(out.contentType).toBe('application/xml; charset=utf-8');
  });

  it('passes unknown charsets through untouched', () => {
    const out = toUtf8(Buffer.from('<rss/>'), 'text/xml; charset=x-made-up');
    expect(out.contentType).toBe('text/xml; charset=x-made-up');
  });
});
