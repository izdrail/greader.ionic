import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';

/** One generated summary. article + content hash + model identify it: a changed article or a new model means a new summary. */
export interface CachedSummary { key: string; articleId: string; contentHash: string; model: string; summary: string; createdAt: number; }

export function summaryKey(articleId: string, contentHash: string, model: string): string { return `${articleId}|${contentHash}|${model}`; }

export abstract class SummaryCache {
  abstract get(articleId: string, contentHash: string, model: string): Promise<CachedSummary | undefined>;
  abstract put(entry: Omit<CachedSummary, 'key'>): Promise<void>;
  /** Clear one article's summaries, or all of them. Returns how many were removed. */
  abstract clear(articleId?: string): Promise<number>;
  abstract count(): Promise<number>;
}

class SummaryDb extends Dexie {
  summaries!: Table<CachedSummary, string>;
  constructor() { super('greader-ai'); this.version(1).stores({ summaries: 'key,articleId,createdAt' }); }
}

/** Summaries live in their own IndexedDB database next to the article store, so the article schema is untouched. */
@Injectable({ providedIn: 'root' })
export class IndexedDbSummaryCache extends SummaryCache {
  private db = new SummaryDb();
  get(articleId: string, contentHash: string, model: string) { return this.db.summaries.get(summaryKey(articleId, contentHash, model)); }
  async put(entry: Omit<CachedSummary, 'key'>) {
    // Only the latest summary per article is useful; drop older ones for other content/model versions.
    await this.db.transaction('rw', this.db.summaries, async () => {
      await this.db.summaries.where('articleId').equals(entry.articleId).delete();
      await this.db.summaries.put({ ...entry, key: summaryKey(entry.articleId, entry.contentHash, entry.model) });
    });
  }
  async clear(articleId?: string) {
    if (articleId) return this.db.summaries.where('articleId').equals(articleId).delete();
    const n = await this.db.summaries.count();
    await this.db.summaries.clear();
    return n;
  }
  count() { return this.db.summaries.count(); }
}

/** In-memory cache for tests and environments without IndexedDB. */
export class MemorySummaryCache extends SummaryCache {
  private map = new Map<string, CachedSummary>();
  async get(articleId: string, contentHash: string, model: string) { return this.map.get(summaryKey(articleId, contentHash, model)); }
  async put(entry: Omit<CachedSummary, 'key'>) {
    for (const [k, v] of this.map) if (v.articleId === entry.articleId) this.map.delete(k);
    const key = summaryKey(entry.articleId, entry.contentHash, entry.model);
    this.map.set(key, { ...entry, key });
  }
  async clear(articleId?: string) {
    let n = 0;
    for (const [k, v] of this.map) if (!articleId || v.articleId === articleId) { this.map.delete(k); n++; }
    return n;
  }
  async count() { return this.map.size; }
}
