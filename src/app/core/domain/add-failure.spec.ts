import { addFailureReason } from './add-failure';

describe('addFailureReason', () => {
  it('explains a 429 from the web proxy', () => {
    expect(addFailureReason(new Error('Feed upstream returned 429'))).toBe('The feed site is rate limiting requests (429). Not added.');
  });
  it('explains a 429 from the native request path', () => {
    expect(addFailureReason(new Error('Feed request failed (429)'))).toContain('rate limiting');
  });
  it('maps other HTTP failures', () => {
    expect(addFailureReason(new Error('Feed upstream returned 404'))).toBe('Feed not found (404). Not added.');
    expect(addFailureReason(new Error('Feed upstream returned 403'))).toContain('refused access');
    expect(addFailureReason(new Error('Feed upstream returned 503'))).toContain('had an error (503)');
  });
  it('keeps other messages readable', () => {
    expect(addFailureReason(new Error('No feed found on that page. Paste the direct feed URL instead.'))).toBe('No feed found on that page. Paste the direct feed URL instead. Not added.');
    expect(addFailureReason(undefined)).toBe('Could not add this feed.');
  });
});
