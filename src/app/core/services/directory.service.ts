import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export interface DirectoryFeed { title: string; url: string; }
export interface DirectoryBundle { id: string; title: string; feeds: DirectoryFeed[]; featured?: boolean; }
export interface PodcastResult extends DirectoryFeed { image?: string; author?: string; }
interface RawBundle { id: string; title: string; isfeatured?: boolean; subscriptions?: { id: string; title: string }[]; }

@Injectable({ providedIn: 'root' })
export class DirectoryService {
  async bundles(kind: 'browse' | 'news'): Promise<DirectoryBundle[]> {
    const response = await fetch(`assets/directory/${kind}.json`);
    if (!response.ok) throw new Error(`Could not load ${kind} directory`);
    const data = await response.json() as { bundles: Record<string, RawBundle> };
    return Object.values(data.bundles).map(bundle => ({
      id: bundle.id, title: bundle.title, featured: bundle.isfeatured,
      feeds: (bundle.subscriptions ?? []).map(feed => ({ title: feed.title, url: this.feedUrl(feed.id) })).filter(feed => !!feed.url),
    })).sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || a.title.localeCompare(b.title));
  }

  async podcastKeywords(): Promise<string[]> {
    const response = await fetch('assets/directory/podcast-keywords.json');
    const rows = await response.json() as { name: string; usage: number }[];
    return rows.sort((a, b) => b.usage - a.usage).slice(0, 30).map(row => row.name);
  }

  async searchPodcasts(query: string): Promise<PodcastResult[]> {
    const endpoint = Capacitor.isNativePlatform()
      ? `https://itunes.apple.com/search?media=podcast&limit=50&term=${encodeURIComponent(query)}`
      : `${environment.podcastProxyUrl}?term=${encodeURIComponent(query)}`;
    const response = Capacitor.isNativePlatform()
      ? await CapacitorHttp.get({ url: endpoint, responseType: 'json', connectTimeout: 15_000, readTimeout: 30_000 })
      : await fetch(endpoint, { credentials: 'same-origin' }).then(async value => ({ status: value.status, data: await value.json() }));
    if (response.status < 200 || response.status >= 300) throw new Error(`Podcast search failed (${response.status})`);
    const data = response.data as { results?: { collectionName?: string; feedUrl?: string; artworkUrl100?: string; artistName?: string }[] };
    return (data.results ?? []).filter(item => item.feedUrl).map(item => ({ title: item.collectionName || 'Podcast', url: item.feedUrl!, image: item.artworkUrl100, author: item.artistName }));
  }

  private feedUrl(id: string) { return id.startsWith('feed/') ? id.slice(5) : id; }
}
