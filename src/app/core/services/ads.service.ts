import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdOptions, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

/**
 * AdMob unit configuration.
 *
 * These are Google's public test IDs. Replace both with the real AdMob
 * app/banner units (AndroidManifest.xml + Info.plist carry the app ID) before
 * a store release - serving test IDs in production earns no revenue, and
 * serving production IDs in development risks an AdMob policy strike.
 */
export const ADMOB_BANNER_UNIT_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
export const ADMOB_BANNER_UNIT_IOS = 'ca-app-pub-3940256099942544/1712485313';

/** Banner advertising through AdMob. No-ops in the browser and when ads fail to load. */
@Injectable({ providedIn: 'root' })
export class AdsService {
  private initialized = false;
  private visible = false;

  private async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    if (!this.initialized) {
      try {
        await AdMob.initialize({ initializeForTesting: true });
        this.initialized = true;
      } catch {
        return false; // play services unavailable - ads stay off
      }
    }
    return true;
  }

  /** Shows the adaptive banner pinned to the bottom of the screen. */
  async showBanner(): Promise<void> {
    if (this.visible || !(await this.initialize())) return;
    const options: BannerAdOptions = {
      adId: Capacitor.getPlatform() === 'ios' ? ADMOB_BANNER_UNIT_IOS : ADMOB_BANNER_UNIT_ANDROID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true,
    };
    try {
      await AdMob.showBanner(options);
      this.visible = true;
    } catch { /* ad failed to load; retry on the next view entry */ }
  }

  /** Hides the banner when leaving a view that carries advertising. */
  async hideBanner(): Promise<void> {
    if (!this.visible || !Capacitor.isNativePlatform()) return;
    try {
      await AdMob.hideBanner();
    } catch { /* banner already gone */ }
    this.visible = false;
  }
}
