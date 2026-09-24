import { articleTextForSummary, contentHash, normaliseWhitespace } from './summary-text';

describe('articleTextForSummary', () => {
  it('turns an HTML article into paragraphs of plain text', () => {
    const text = articleTextForSummary('<h2>Big news</h2><p>First <b>para</b>&nbsp;here.</p><p>Second   para.</p><ul><li>One</li><li>Two</li></ul>');
    expect(text).toBe('Big news\n\nFirst para here.\n\nSecond para.\n\n- One\n\n- Two');
  });
  it('keeps plain text articles as they are', () => {
    expect(articleTextForSummary('Just a plain   sentence.\nAnd another.')).toBe('Just a plain sentence.\nAnd another.');
  });
  it('returns nothing for an empty article', () => {
    expect(articleTextForSummary('')).toBe('');
    expect(articleTextForSummary(undefined)).toBe('');
    expect(articleTextForSummary('<p> </p><img src="x.jpg">')).toBe('');
  });
  it('drops scripts, styles and inline handlers', () => {
    const text = articleTextForSummary('<p onclick="x()">Story text.</p><script>alert("pwned")</script><style>p{color:red}</style>');
    expect(text).toBe('Story text.');
  });
  it('drops navigation, ads, share widgets and captions', () => {
    const html = '<nav><a href="/">Home</a><a href="/news">News</a></nav><p>The council approved the plan on Monday.</p>'
      + '<div class="advertisement">Buy now</div><div class="share-tools"><a>Facebook</a><a>X</a></div>'
      + '<figure><img src="a.jpg"><figcaption>Image source, Getty</figcaption></figure><footer>Copyright</footer>';
    expect(articleTextForSummary(html)).toBe('The council approved the plan on Monday.');
  });
});

describe('normaliseWhitespace', () => {
  it('keeps at most one blank line between paragraphs', () => {
    expect(normaliseWhitespace('a  \t b\n\n\n\n c ')).toBe('a b\n\nc');
  });
});

describe('contentHash', () => {
  it('is stable for the same text and changes when the text changes', () => {
    expect(contentHash('hello world')).toBe(contentHash('hello world'));
    expect(contentHash('hello world')).not.toBe(contentHash('hello world!'));
    expect(contentHash('x')).toMatch(/^[0-9a-f]{14}$/);
  });
});
