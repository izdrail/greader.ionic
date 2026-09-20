# 5.2.0 view-by-view parity

Evidence comes from the decoded manifest, first-party layouts, menus, activities and preference XML in `gReader-5.2.0-396-release.apk`.

| APK view / interaction | Ionic route or component | Status |
|---|---|---|
| Welcome / feature guide | `/welcome` | Implemented |
| Reader-service chooser | `/accounts` | Implemented |
| Feedly OAuth login | account card/form | UI implemented; current OAuth credentials/API still required |
| Inoreader login | account card/form | UI implemented; current API contract still required |
| The Old Reader login | account card/form | UI implemented; current API contract still required |
| Local RSS login/start | account card -> `/subscribe` | Implemented |
| Phone home/drawer | `/feeds` responsive drawer | Implemented |
| Tablet master-detail home | split pane at 768px | Implemented structure |
| Subscription/tag navigation | drawer and `/subscriptions` | Implemented; folder tree in drawer, folder create/assign in management |
| Article list: all/unread/starred | `/feeds` segments | Implemented |
| Search articles | `/feeds` search | Implemented |
| List/grid/card selection | settings + toolbar toggle | Implemented; list/grid/card renderers with persisted preference |
| Feed sorting/custom drag order | settings + `/subscriptions` reorder | Implemented; custom/alphabetical/unread/newest, drag order persisted |
| Mark all / mark until / age options | article list toolbar | Implemented; all + 5 age windows |
| Swipe and quick actions | article list | Implemented; swipe read/star in list mode, quick actions in grid/card |
| Subscribe URL/search | `/subscribe` URL | Implemented URL; website feed discovery partial |
| Subscribe podcasts | `/subscribe` Podcasts | Implemented |
| Browse directory | `/subscribe` Browse | Implemented, full 449/3403 APK data |
| News directory | `/subscribe` News | Implemented, full 71/602 APK data |
| OPML import | `/subscribe` OPML | Implemented |
| OPML export | `/subscriptions` toolbar | Implemented; native share sheet, web download |
| Manage sources | `/subscriptions` | Implemented; per-feed preferences editor (notify/sync/hide/offline/display/readability/UA) |
| Change folder / tag edit | subscription management | Implemented folder assign; tag editor and folder rename/delete missing |
| Article feed view | `/article/:id` Feed | Implemented |
| Article simplified/reading view | `/article/:id` Reading | Implemented; readability extraction with absolute URLs |
| Original web view | `/article/:id` Web | Opens original URL |
| Article star/read/share | article toolbar | Implemented |
| Article tag/save page/image fit/invert/fonts/translate | article controls | Implemented font scale/invert/image fit (persisted); tag, save page, translate missing |
| Audio/video enclosure playback | article HTML media controls | Implemented basic playback |
| Podcast/music player/queue | article media + browser controls | Partial; dedicated background player missing |
| Download/offline history | `/downloads` | Implemented cached list; queue/progress missing |
| TTS activity/playlist | `/tts` | Implemented; queue editor, voice/rate/pitch (persisted), media-session controls; true background audio is platform-limited |
| Settings main/categories | `/settings` | Implemented foundation |
| Look/feel and five themes | settings + theme service | Implemented |
| Sync/offline/cache preferences | settings + sync service | Implemented; persisted, startup/interval sync, scheduler while app runs |
| Reading/article controls | settings | Implemented; persisted |
| Notifications/custom feed alerts | settings + notifications service | Implemented post-sync local notification + haptics; per-feed alert scheduling missing |
| Backup/restore settings | settings | Missing |
| Clear cache | settings/home menu | Missing |
| Premium screen | `/premium` | Implemented disclosure; store billing missing |
| Feedback/send log | settings/menu | Missing |
| GIF/video/YouTube overlays and PIP | article renderer | Basic HTML media only; specialized overlays missing |
| Widget icon/small/medium/large config | native Android | Missing |
| Locale automation activity | native Android | Missing |

"1:1" remains open until every Partial/Missing row is implemented and runtime-compared against API 29/API 23 APKs. Static layout matching is not runtime proof.
