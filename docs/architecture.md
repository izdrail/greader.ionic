# Architecture

The migration is a clean implementation based on the audited APK behavior, not decompiled source reuse.

- `core/domain`: provider-neutral entities recovered from gReader's SQLite contract.
- `core/storage`: offline-first port with an IndexedDB/Dexie web implementation. Native SQLite is a later adapter behind the same port.
- `core/feeds`: standards-based RSS/Atom parser with Media RSS/iTunes enclosure hooks.
- `core/providers`: local, Feedly, Inoreader and Old Reader adapters. Cloud methods fail closed until current API/auth contracts are verified. Historical APK credentials are never reused.
- `core/services`: sync orchestration pushes queued local mutations first, then applies the remote snapshot.
- `features`: standalone Ionic pages. Split-pane restores phone/tablet behavior.

## Conflict policy gate

The legacy winner rules are still awaiting emulator validation. Until then, adapters must preserve every pending mutation and use idempotent provider operations. Do not silently choose last-write-wins.

## Feed transport and CORS

Feed parsing is transport-neutral. Native Android/iOS builds fetch subscriptions with Capacitor's native HTTP bridge, so third-party browser CORS headers do not block RSS/Atom. Browser/PWA builds cannot securely bypass a publisher's CORS policy; they use normal `fetch` and show an explicit error when the publisher blocks it. A future hosted web edition needs a first-party, allowlisted server fetch endpoint with SSRF controls, size/time limits and no credential forwarding. Public CORS relays are intentionally not used.
