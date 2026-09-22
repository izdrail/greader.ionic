import { describe, expect, it } from 'vitest';
import { htmlToText, snippet } from './text-preview';

describe('htmlToText', () => {
  it('strips paragraph tags', () => {
    expect(htmlToText('<p>Hello world</p>')).toBe('Hello world');
  });
  it('handles the common markup from feeds', () => {
    expect(htmlToText('<p>Intro</p><br><strong>bold</strong> <em>italic</em> <a href="https://x.example">link</a>')).toBe('Intro bold italic link');
  });
  it('drops script and style blocks entirely', () => {
    expect(htmlToText('<p>keep</p><script>alert(1)</script><style>.x{}</style>')).toBe('keep');
  });
  it('decodes entities and collapses whitespace', () => {
    expect(htmlToText('<p>Fish &amp; Chips</p>\n<p>line&nbsp;two</p>')).toBe('Fish & Chips line two');
  });
  it('returns an empty string for missing or markup-only content', () => {
    expect(htmlToText(undefined)).toBe('');
    expect(htmlToText('')).toBe('');
    expect(htmlToText('<p>  </p>')).toBe('');
  });
});

describe('snippet', () => {
  it('keeps short text whole', () => {
    expect(snippet('<p>short</p>')).toBe('short');
  });
  it('truncates long text on a word boundary with an ellipsis', () => {
    const long = `<p>${'word '.repeat(80)}</p>`;
    const out = snippet(long, 120);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(122);
    expect(out).not.toContain('<');
  });
});
