import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Subscription, Tag } from '../domain/models';
import { buildOpml } from '../domain/opml';

/** Exports subscriptions as OPML: native share sheet on device, file download on web. */
@Injectable({ providedIn: 'root' })
export class OpmlExportService {
  readonly filename = 'greader-subscriptions.opml';

  build(subscriptions: Subscription[], now = Date.now(), folders: Tag[] = []): string {
    return buildOpml(subscriptions, 'gReader News subscriptions', now, folders);
  }

  async export(subscriptions: Subscription[], folders: Tag[] = []): Promise<'shared' | 'downloaded'> {
    const xml = this.build(subscriptions, Date.now(), folders);
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({ path: this.filename, data: xml, directory: Directory.Cache, encoding: Encoding.UTF8 });
      await Share.share({ title: 'Export subscriptions', url: file.uri });
      return 'shared';
    }
    const url = URL.createObjectURL(new Blob([xml], { type: 'text/x-opml' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
}
