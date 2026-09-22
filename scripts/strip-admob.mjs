/**
 * Removes AdMob from the app before a build when the workflow variable
 * ENABLE_ADMOB is not 'true'. The committed repo always carries the full
 * integration; CI strips it here so released builds contain no ad SDK,
 * no manifest entry and no ad code until the switch is flipped.
 *
 * Run AFTER `npm rm @capacitor-community/admob` (the workflow does this).
 */
import { readFileSync, writeFileSync } from 'node:fs';

// 1. Replace the ads service with a no-op stub that keeps the public API,
//    so callers (shell.page.ts) and the spec compile unchanged.
const stub = `import { Injectable } from '@angular/core';

/**
 * Stripped build: AdMob was removed at build time (ENABLE_ADMOB was not
 * 'true' in the workflow). This stub keeps the AdsService API so the rest
 * of the app compiles; advertising is entirely absent from this build.
 */
export const ADMOB_BANNER_UNIT_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
export const ADMOB_BANNER_UNIT_IOS = 'ca-app-pub-3940256099942544/1712485313';

@Injectable({ providedIn: 'root' })
export class AdsService {
  async showBanner(): Promise<void> { /* ads stripped from this build */ }
  async hideBanner(): Promise<void> { /* ads stripped from this build */ }
}
`;
writeFileSync('src/app/core/services/ads.service.ts', stub);
console.log('strip-admob: ads.service.ts replaced with no-op stub');

// 2. Remove the AdMob app ID from the Android manifest.
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
const manifest = readFileSync(manifestPath, 'utf8');
const block = /\s*<!-- Google AdMob:[^>]*-->\s*<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^/]*\/>\s*/;
if (block.test(manifest)) {
  writeFileSync(manifestPath, manifest.replace(block, '\n'));
  console.log('strip-admob: APPLICATION_ID meta-data removed from AndroidManifest.xml');
} else {
  console.log('strip-admob: no AdMob meta-data in manifest (already absent)');
}
