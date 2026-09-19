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
