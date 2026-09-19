import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export interface FeedHttpResponse { status: number; body: string; }

@Injectable({ providedIn: 'root' })
export class FeedHttpService {
  async get(url: string): Promise<FeedHttpResponse> {
    const headers = { Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml, */*;q=0.1' };
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({ url, headers, responseType: 'text', connectTimeout: 15_000, readTimeout: 30_000 });
      return { status: response.status, body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data) };
    }
    const endpoint = new URL(environment.feedProxyUrl, window.location.origin);
    endpoint.searchParams.set('url', url);
    const response = await fetch(endpoint, { headers: { Accept: 'application/xml, text/xml, application/json' }, credentials: 'same-origin' });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(detail.error || `Feed proxy failed (${response.status})`);
    }
    return { status: response.status, body: await response.text() };
  }
}
