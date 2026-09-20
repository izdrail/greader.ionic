import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeBridgePlugin {
  setUnreadCount(options: { count: number }): Promise<void>;
  setAppLocale(options: { locale: string }): Promise<void>;
}

const NativeBridge = registerPlugin<NativeBridgePlugin>('NativeBridge');

/**
 * Bridges app state to native-only surfaces (home-screen widget, per-app locale).
 * No-ops in the browser. The matching Java plugin is an unverified stub - see
 * docs/native-bridge.md - so calls are swallowed until it ships.
 */
@Injectable({ providedIn: 'root' })
export class NativeBridgeService {
  async updateUnread(count: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try { await NativeBridge.setUnreadCount({ count }); } catch { /* native bridge not available yet */ }
  }

  async applyLocale(locale: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try { await NativeBridge.setAppLocale({ locale }); } catch { /* native bridge not available yet */ }
  }
}
