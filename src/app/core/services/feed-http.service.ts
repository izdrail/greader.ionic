import { Injectable } from '@angular/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface FeedHttpResponse { status: number; body: string; }

@Injectable({ providedIn: 'root' })
export class FeedHttpService {
  async get(url: string): Promise<FeedHttpResponse> {
    const headers = { Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml, */*;q=0.1' };
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({ url, headers, responseType: 'text', connectTimeout: 15_000, readTimeout: 30_000 });
      return { status: response.status, body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data) };
    }
    try {
      const response = await fetch(url, { headers, redirect: 'follow' });
      return { status: response.status, body: await response.text() };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('This feed blocks browser requests (CORS). Open gReader as the Android/iOS app, where feeds use native HTTP, or enable CORS on the feed server.');
      }
      throw error;
    }
  }
}
