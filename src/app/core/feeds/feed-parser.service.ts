import { Injectable } from '@angular/core';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ParsedFeed, ParsedFeedItem } from '../domain/models';

@Injectable({ providedIn: 'root' })
export class FeedParserService {
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
  });

  parse(source: string): ParsedFeed {
    const body = source.replace(/^\uFEFF/, '').trim();
    if (!body) throw new Error('The feed is empty');
    if (body.startsWith('{')) return this.parseJsonFeed(body);
    if (/^<!doctype\s+html|^<html[\s>]/i.test(body)) {
      throw new Error('This URL returned a web page, not an RSS or Atom feed');
    }
    const valid = XMLValidator.validate(body);
    if (valid !== true) {
      throw new Error(`The feed contains invalid XML${valid.err?.line ? ` at line ${valid.err.line}` : ''}`);
    }

    const document = this.parser.parse(body);
    const rss = document.rss?.channel;
    const rdf = document.RDF;
    const atom = document.feed;
    const root = rss ?? rdf?.channel ?? atom;
    if (!root) throw new Error('Unsupported feed format. Expected RSS, Atom, RDF or JSON Feed');
    const entries = this.array(rss?.item ?? rdf?.item ?? atom?.entry);

    return {
      title: this.text(root.title) || 'Untitled feed',
      link: this.link(root.link),
      description: this.text(root.description ?? root.subtitle),
      language: this.text(root.language),
      image: this.image(root),
      items: entries.map(entry => this.item(entry)),
    };
  }

  private parseJsonFeed(body: string): ParsedFeed {
    let feed: any;
    try { feed = JSON.parse(body); } catch { throw new Error('The feed contains invalid JSON'); }
    if (!feed || typeof feed !== 'object' || !String(feed.version ?? '').includes('jsonfeed.org/version/')) {
      throw new Error('Unsupported JSON feed format');
    }
    return {
      title: this.text(feed.title) || 'Untitled feed',
      link: this.text(feed.home_page_url),
      description: this.text(feed.description),
      language: this.text(feed.language),
      image: this.text(feed.icon ?? feed.favicon),
      items: this.array<any>(feed.items).map(item => {
        const attachments = this.array<any>(item.attachments);
        const audio = attachments.find(value => String(value?.mime_type ?? '').startsWith('audio/'))?.url;
        const video = attachments.find(value => String(value?.mime_type ?? '').startsWith('video/'))?.url;
        const content = this.text(item.content_html ?? item.content_text ?? item.summary);
        const link = this.text(item.url ?? item.external_url);
        return {
          uid: this.text(item.id) || link || `${this.text(item.title)}:${this.text(item.date_published)}`,
          title: this.text(item.title) || '(untitled)', link,
          author: this.text(item.author?.name ?? item.authors?.[0]?.name), content,
          image: this.text(item.image ?? item.banner_image) || this.htmlImage(content), audio, video,
          publishedAt: this.date(item.date_published ?? item.date_modified),
        };
      }),
    };
  }

  private item(item: any): ParsedFeedItem {
    const link = this.link(item.link);
    const content = this.text(item.encoded ?? item.content ?? item.description ?? item.summary);
    const enclosures = this.array<any>(item.enclosure);
    const media = this.array<any>(item.content).filter(value => value && typeof value === 'object' && value['@_url']);
    const audio = [...enclosures, ...media].find(value => String(value?.['@_type'] ?? '').startsWith('audio/'))?.['@_url'];
    const video = [...enclosures, ...media].find(value => String(value?.['@_type'] ?? '').startsWith('video/'))?.['@_url'];
    const uid = this.text(item.guid ?? item.id ?? item['@_about']) || link || `${this.text(item.title)}:${this.text(item.pubDate ?? item.updated)}`;
    return {
      uid,
      title: this.text(item.title) || '(untitled)',
      link,
      author: this.text(item.author?.name ?? item.author ?? item.creator),
      content,
      image: this.image(item) || this.htmlImage(content),
      audio,
      video,
      publishedAt: this.date(item.pubDate ?? item.published ?? item.updated ?? item.date),
    };
  }

  private image(value: any): string | undefined {
    return this.text(value.image?.url ?? value.logo ?? value.icon ?? value.thumbnail?.['@_url']) ||
      this.array<any>(value.content).find(item => String(item?.['@_medium'] ?? '').toLowerCase() === 'image')?.['@_url'];
  }

  private htmlImage(html: string) { return html.match(/<img[^>]+src=["']([^"']+)/i)?.[1]; }
  private date(value: any) { const parsed = Date.parse(this.text(value)); return Number.isNaN(parsed) ? Date.now() : parsed; }
  private link(value: any) {
    if (Array.isArray(value)) value = value.find(item => !item?.['@_rel'] || item['@_rel'] === 'alternate') ?? value[0];
    return typeof value === 'string' ? value : value?.['@_href'] ?? value?.['@_resource'] ?? this.text(value);
  }
  private text(value: any): string {
    if (value == null) return '';
    if (typeof value === 'object') return String(value['#text'] ?? value['@_href'] ?? value['@_resource'] ?? '');
    return String(value);
  }
  private array<T>(value: T | T[] | undefined): T[] { return value == null ? [] : Array.isArray(value) ? value : [value]; }
}
