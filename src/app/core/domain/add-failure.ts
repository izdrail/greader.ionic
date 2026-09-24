/**
 * Turn a failed add/import into a short reason for the failed row. The web proxy reports upstream
 * errors as "Feed upstream returned <status>"; native builds report "Feed request failed (<status>)".
 */
export function addFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const status = /(?:returned|failed \(|proxy failed \()\s*(\d{3})/i.exec(message)?.[1];
  if (status === '429') return 'The feed site is rate limiting requests (429). Not added.';
  if (status === '404' || status === '410') return `Feed not found (${status}). Not added.`;
  if (status === '401' || status === '403') return `The feed site refused access (${status}). Not added.`;
  if (status && status.startsWith('5')) return `The feed site had an error (${status}). Not added.`;
  return message ? `${message.replace(/\.$/, '')}. Not added.` : 'Could not add this feed.';
}
