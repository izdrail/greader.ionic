export type ProviderKind = 'local' | 'feedly' | 'inoreader' | 'old-reader';
export type ThemeId = 'default' | 'green' | 'sepia' | 'dark' | 'black';
export type ReadingMode = 'feed' | 'original' | 'simplified';

export interface Account { id: string; provider: ProviderKind; label: string; createdAt: number; lastSyncAt?: number; }
export interface Subscription {
  id: string; accountId: string; uid: string; title: string; feedUrl?: string; htmlUrl?: string; iconUrl?: string; folderId?: string;
  sort: number; unreadCount: number; newestItemAt: number; syncExcluded: boolean; hidden: boolean; notification: boolean;
  imageFit: boolean; javascript: boolean; offlineContent: -1 | 0 | 1 | 2 | 3 | 4; displayContent: -1 | 0 | 1;
  linkFormat: -1 | 0 | 1; autoReadability: -1 | 0 | 1 | 2; userAgent: -1 | 0 | 1 | 2 | 3; charset?: string;
}
export interface Tag { id: string; accountId: string; uid: string; type: 'folder'|'tag'|'system'; label: string; sort: number; unreadCount: number; syncExcluded: boolean; hidden: boolean; }
export interface Article {
  id: string; accountId: string; subscriptionId: string; uid: string; title: string; content?: string; author?: string;
  link?: string; image?: string; video?: string; audio?: string; publishedAt: number; updatedAt: number; starred: boolean;
  cached: boolean; read: boolean; readAt?: number; keepUnread: boolean; syncAt?: number; tags?: string[];
}
export interface PendingMutation { id: string; accountId: string; articleUid: string; kind: 'read'|'star'|'tag'; value: boolean|string; createdAt: number; attempts: number; }
export interface ParsedFeed { title: string; link?: string; description?: string; language?: string; image?: string; items: ParsedFeedItem[]; }
export interface ParsedFeedItem { uid: string; title: string; link?: string; author?: string; content?: string; image?: string; audio?: string; video?: string; publishedAt: number; }
