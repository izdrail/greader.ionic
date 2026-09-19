# Migration traceability matrix

| Feature | APK evidence | Ionic implementation | State |
|---|---|---|---|
| Feedly/Inoreader/Old Reader/local | Login activities/layouts | visible provider chooser and provider-specific connect forms; local enabled, cloud fails closed | Partial, API research required |
| Offline state | subscription/tag/item/history SQLite tables | typed domain + Dexie adapter + mutation queue | Implemented foundation |
| RSS/Atom/podcast parsing | syndication handlers, Media/iTunes/chapters | URL subscription + `FeedParserService` + local persistence | Local RSS end-to-end foundation |
| Sync/read/star/tag | Sync/Feed services + special provider URIs | `SyncService`, pending mutations | Foundation; conflict runtime gate open |
| Feed navigation/list/grid/card | Home + ItemList fragments/layouts | responsive split-pane article shell | Foundation |
| Reading modes | ItemFragment/WebView/feed.html | article route/render shell | Foundation |
| Themes | exact five theme resource sets | normalized Ionic CSS variables | Implemented foundation |
| Search/filter/sort/swipe | preference arrays/dialogs | filter shell and domain contracts | Partial |
| Podcasts/TTS/downloads | Music/TTS/Download services | service boundaries only | Planned |
| Notifications/widgets | receivers/providers/XML | Capacitor notification dependency; widget native bridge | Planned, runtime gate open |
| Backup/restore | settings `.pref` serializer | documented non-secret settings export contract | Planned |

Runtime comparison against 5.2.0/API 29 and 4.3.1 Pro/API 23 was deferred by owner decision. Static evidence is not labeled observed behavior.
