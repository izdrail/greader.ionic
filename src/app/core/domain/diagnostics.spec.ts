import { buildDiagnosticsReport, feedbackMailto } from './diagnostics';

describe('buildDiagnosticsReport', () => {
  it('includes version, platform, sync state and counts', () => {
    const report = buildDiagnosticsReport({
      appVersion: '1.0.0', platform: 'web', userAgent: 'UA', accountProvider: 'local', accountLabel: 'Local',
      lastSyncAt: 1000, lastSyncError: 'boom', subscriptionCount: 3, articleCount: 42, unreadCount: 5,
    }, 0);
    expect(report).toContain('App version: 1.0.0');
    expect(report).toContain('Local (local)');
    expect(report).toContain('Last sync error: boom');
    expect(report).toContain('Unread: 5');
    expect(report).toContain('Generated: 1970-01-01T00:00:00.000Z');
  });

  it('handles a missing account and no sync', () => {
    const report = buildDiagnosticsReport({ appVersion: '1', platform: 'web', userAgent: 'UA', subscriptionCount: 0, articleCount: 0, unreadCount: 0 }, 0);
    expect(report).toContain('Account: none');
    expect(report).toContain('Last sync: never');
    expect(report).toContain('Last sync error: none');
  });
});

describe('feedbackMailto', () => {
  it('builds an encoded mailto with the version footer', () => {
    const url = feedbackMailto('dev@example.com', '1.2.3');
    expect(url.startsWith('mailto:dev@example.com?subject=gReader%20feedback')).toBe(true);
    expect(decodeURIComponent(url)).toContain('App version: 1.2.3');
  });
});
