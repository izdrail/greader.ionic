export interface DiagnosticsInput {
  appVersion: string;
  platform: string;
  userAgent: string;
  accountProvider?: string;
  accountLabel?: string;
  lastSyncAt?: number;
  lastSyncError?: string;
  subscriptionCount: number;
  articleCount: number;
  unreadCount: number;
}

/** Plain-text diagnostic report for the "send log" support action. */
export function buildDiagnosticsReport(input: DiagnosticsInput, now: number): string {
  const lines = [
    'gReader News diagnostic report',
    `Generated: ${new Date(now).toISOString()}`,
    '',
    `App version: ${input.appVersion}`,
    `Platform: ${input.platform}`,
    `User agent: ${input.userAgent}`,
    '',
    `Account: ${input.accountLabel ?? 'none'}${input.accountProvider ? ` (${input.accountProvider})` : ''}`,
    `Last sync: ${input.lastSyncAt ? new Date(input.lastSyncAt).toISOString() : 'never'}`,
    `Last sync error: ${input.lastSyncError ?? 'none'}`,
    '',
    `Subscriptions: ${input.subscriptionCount}`,
    `Articles: ${input.articleCount}`,
    `Unread: ${input.unreadCount}`,
  ];
  return `${lines.join('\n')}\n`;
}

/** Support email subject/body for feedback; keeps the body short enough for a mailto. */
export function feedbackMailto(address: string, appVersion: string): string {
  const subject = encodeURIComponent('gReader News feedback');
  const body = encodeURIComponent(`\n\n\n---\nApp version: ${appVersion}`);
  return `mailto:${address}?subject=${subject}&body=${body}`;
}
