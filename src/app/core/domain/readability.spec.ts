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

describe('extractMainContent cleanup', () => {
  it('removes common clutter and inline event handlers', () => {
    const out = extractMainContent(`<main><div class="article-body"><p onclick="steal()">${'Useful sentence. '.repeat(30)}</p><div class="newsletter">Sign up</div><div class="related">More stories</div></div></main>`);
    expect(out).toContain('Useful sentence.');
    expect(out).not.toContain('Sign up');
    expect(out).not.toContain('More stories');
    expect(out).not.toContain('onclick');
  });

  it('prefers article copy over a link-heavy container', () => {
    const links = '<a href="#">menu item</a>'.repeat(80);
    const copy = `<div class="story-body"><p>${'Full report sentence. '.repeat(45)}</p></div>`;
    expect(extractMainContent(`<body><div>${links}</div>${copy}</body>`)).toContain('Full report sentence.');
  });
});

describe('absolutizeUrls lazy images', () => {
  it('promotes lazy image URLs and adds loading hints', () => {
    const out = absolutizeUrls('<img data-src="/hero.jpg">', 'https://example.com/story');
    expect(out).toContain('src="https://example.com/hero.jpg"');
    expect(out).toContain('loading="lazy"');
  });
});
