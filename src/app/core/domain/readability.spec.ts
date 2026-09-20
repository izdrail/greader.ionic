import { absolutizeUrls, extractMainContent } from './readability';

describe('extractMainContent', () => {
  it('prefers the article element and strips chrome', () => {
    const html = `<html><body><nav>Home | About</nav><article><h1>Story</h1><p>${'Long text. '.repeat(30)}</p><script>bad()</script></article><aside>ads</aside></body></html>`;
    const out = extractMainContent(html);
    expect(out).toContain('Long text.');
    expect(out).not.toContain('bad()');
    expect(out).not.toContain('Home | About');
  });

  it('scores the densest div when no semantic container exists', () => {
    const html = `<html><body><div class="x"><a href="#">link link link link link</a></div><div class="y"><p>${'Body copy. '.repeat(40)}</p></div></body></html>`;
    const out = extractMainContent(html);
    expect(out).toContain('Body copy.');
  });

  it('falls back to the body for tiny pages', () => {
    expect(extractMainContent('<html><body><p>Hi</p></body></html>')).toContain('Hi');
  });
});

describe('absolutizeUrls', () => {
  it('resolves relative hrefs and srcs against the page URL', () => {
    const out = absolutizeUrls('<p><a href="/next">n</a><img src="img.png"></p>', 'https://example.com/blog/post');
    expect(out).toContain('href="https://example.com/next"');
    expect(out).toContain('src="https://example.com/blog/img.png"');
    expect(out).toContain('target="_blank"');
  });

  it('leaves data URIs and absolute URLs untouched', () => {
    const out = absolutizeUrls('<img src="data:image/png;base64,AA"><a href="https://x.test/a">x</a>', 'https://example.com/');
    expect(out).toContain('src="data:image/png;base64,AA"');
    expect(out).toContain('href="https://x.test/a"');
  });
});
