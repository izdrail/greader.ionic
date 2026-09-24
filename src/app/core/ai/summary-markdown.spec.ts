import { cleanModelOutput, summaryMarkdownToHtml, summaryMarkdownToText } from './summary-markdown';

describe('summaryMarkdownToHtml', () => {
  it('renders paragraphs, bullets and bold', () => {
    expect(summaryMarkdownToHtml('The **main** point.\n\n- One\n- Two')).toBe('<p>The <strong>main</strong> point.</p><ul><li>One</li><li>Two</li></ul>');
  });
  it('never lets model output inject markup', () => {
    const html = summaryMarkdownToHtml('<img src=x onerror=alert(1)> <script>alert(2)</script> [x](javascript:alert(3))');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<a');
    expect(html).toContain('&lt;img');
  });
  it('turns headings into bold paragraphs and numbered lists into ol', () => {
    expect(summaryMarkdownToHtml('## Title\n1. First\n2. Second')).toBe('<p><strong>Title</strong></p><ol><li>First</li><li>Second</li></ol>');
  });
});

describe('summaryMarkdownToText', () => {
  it('strips Markdown for the clipboard', () => {
    expect(summaryMarkdownToText('## Head\nThe **main** *point*.\n* One\n- Two')).toBe('Head\nThe main point.\n- One\n- Two');
  });
});

describe('cleanModelOutput', () => {
  it('removes reasoning blocks and preambles', () => {
    expect(cleanModelOutput('<think>hmm</think>\nHere is a concise summary of the article:\nThe council voted.')).toBe('The council voted.');
    expect(cleanModelOutput('TL;DR: Prices rose 5%.')).toBe('Prices rose 5%.');
    expect(cleanModelOutput('TL;DR Blood tests found PFOA.')).toBe('Blood tests found PFOA.');
    expect(cleanModelOutput('**TLDR** - Rates held.')).toBe('Rates held.');
    expect(cleanModelOutput('Summary judgment was denied.')).toBe('Summary judgment was denied.');
    expect(cleanModelOutput('<think>still thinking')).toBe('');
  });
});
