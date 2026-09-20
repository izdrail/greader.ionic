# Native bridge stubs (widgets + locale)

Status: **UNVERIFIED**. The Java/plugin code in this area has never been
compiled or run - the build environment has no Android toolchain. It is a
faithful stub pending `cd android && ./gradlew assembleDebug` and on-device
verification. Do not treat the matrix rows as runtime-verified.

## What is stubbed

- `NativeBridgePlugin` (`com.izdrail.greader.NativeBridgePlugin`) - Capacitor
  plugin exposing `setUnreadCount` and `setAppLocale`, persisting both to a
  SharedPreferences file so they survive process death.
- `UnreadWidgetProvider` - a resizable home-screen widget showing the unread
  article count, tap opens the app. One resizable provider covers the original
  APK's icon/small/medium/large variants.
- Locale automation - `MainActivity.onCreate` re-applies the stored per-app
  locale via `AppCompatDelegate.setApplicationLocales`; the settings page has a
  Language select (System default / English until translations exist).

## Web-side wiring (verified by the test suite)

- `NativeBridgeService` (TS) no-ops off native and swallows bridge errors until
  the plugin ships.
- The shell pushes the total unread count after every load.
- The `locale` setting is sanitized (`system` or a BCP-47-ish tag) and persisted
  with the rest of the app settings.

## To verify

1. `npm run build && npx cap sync android`
2. `cd android && ./gradlew assembleDebug`
3. Install on a device, add the widget to the home screen, confirm the count
   tracks the unread total and the tap opens the app.
4. Change Language in settings, confirm the locale applies and survives an app
   restart.
