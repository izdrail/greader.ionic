import { chunkText, planSummary } from './summary-plan';

const sentence = (i: number) => `Sentence number ${i} says something useful about the story.`;
const paragraph = (from: number, n: number) => Array.from({ length: n }, (_, i) => sentence(from + i)).join(' ');
const limits = { minChars: 100, chunkChars: 600, maxChunks: 3 };

describe('planSummary', () => {
  it('refuses articles with too little text', () => {
    expect(planSummary('Short teaser only.', limits).kind).toBe('insufficient');
  });
  it('sends short articles in one pass', () => {
    const text = paragraph(0, 8);
    expect(planSummary(text, limits)).toEqual({ kind: 'direct', text });
  });
  it('chunks longer articles', () => {
    const text = [paragraph(0, 6), paragraph(6, 6), paragraph(12, 6)].join('\n\n');
    const plan = planSummary(text, limits);
    expect(plan.kind).toBe('chunked');
    if (plan.kind === 'chunked') expect(plan.chunks.every(c => c.length <= 600)).toBe(true);
  });
  it('reports articles beyond the chunk budget as too large instead of truncating', () => {
    const text = Array.from({ length: 10 }, (_, i) => paragraph(i * 6, 6)).join('\n\n');
    expect(planSummary(text, limits)).toEqual({ kind: 'too-large', chunks: expect.any(Number) });
  });
});

describe('chunkText', () => {
  it('breaks between paragraphs, never inside one that fits', () => {
    const a = paragraph(0, 5), b = paragraph(5, 5), c = paragraph(10, 5);
    const chunks = chunkText([a, b, c].join('\n\n'), a.length + b.length + 2);
    expect(chunks).toEqual([`${a}\n\n${b}`, c]);
  });
  it('splits an oversized paragraph at sentence boundaries', () => {
    const chunks = chunkText(paragraph(0, 20), 300);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) { expect(c.length).toBeLessThanOrEqual(300); expect(c.trim().endsWith('.')).toBe(true); }
  });
  it('folds a tiny trailing piece into the previous chunk', () => {
    const chunks = chunkText(`${paragraph(0, 9)}\n\nOk.`, 540);
    expect(chunks.length).toBe(1);
  });
});
