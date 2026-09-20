import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

/** Post-sync local notifications and haptics, honoring the user's settings. No-ops on web. */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private id = 1;

  async notifySyncResult(newArticles: number, options: { notify: boolean; vibrate: boolean }): Promise<void> {
    if (!Capacitor.isNativePlatform() || newArticles <= 0) return;
    if (options.vibrate) {
      try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* haptics unavailable */ }
    }
    if (!options.notify) return;
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;
      await LocalNotifications.schedule({
        notifications: [{
          id: this.id++,
          title: 'gReader sync complete',
          body: `${newArticles} new article${newArticles === 1 ? '' : 's'} ready to read`,
        }],
      });
    } catch { /* notifications unavailable */ }
  }
}
