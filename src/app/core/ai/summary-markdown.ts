/**
 * Model output is untrusted, exactly like feed content. We never render it as HTML: the text is escaped first and
 * only a small Markdown subset (paragraphs, bullets, numbered lists, bold, italic) is turned back into tags we build.
 */

/** Drop reasoning blocks and chatter some small models emit around the answer. */
export function cleanModelOutput(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, '')
    .replace(/^\s*(here(?:'s| is) (?:a |the )?(?:concise |short )?summary[^:\n]*:)\s*/i, '')
    .replace(/^\s*\**tl;?\s*dr\**\s*[:\-\u2013]?\s*/i, '')
    .replace(/^\s*\**summary\**\s*:\s*/i, '')
    .trim();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function inline(escaped: string): string {
  return escaped
    .replace(/\*\*(?=\S)([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([^_]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*(?=\S)([^*]+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** Render the Markdown subset to HTML built from escaped text only. */
export function summaryMarkdownToHtml(markdown: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => { if (paragraph.length) { out.push(`<p>${paragraph.join(' ')}</p>`); paragraph = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (!line) { flushParagraph(); closeList(); continue; }
    if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(escapeHtml((bullet ?? numbered)![1]))}</li>`);
      continue;
    }
    closeList();
    if (heading) { flushParagraph(); out.push(`<p><strong>${inline(escapeHtml(heading[1]))}</strong></p>`); continue; }
    paragraph.push(inline(escapeHtml(line)));
  }
  flushParagraph();
  closeList();
  return out.join('');
}

/** Plain text for the clipboard: Markdown markers removed, bullets kept readable. */
export function summaryMarkdownToText(markdown: string): string {
  return markdown
    .split('\n')
    .map(line => line.trim().replace(/^#{1,6}\s+/, '').replace(/^[*•]\s+/, '- '))
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
