# gReader Ionic

Clean-room Ionic/Angular migration of gReader, grounded in an audit of the archived Android APKs.

## Status

Architecture and offline-first foundations are in place. Cloud provider APIs, runtime APK comparison, native widgets, media/TTS and release builds remain gated work. See `docs/parity-checklist.md`.

## Development

```bash
npm ci
npm test -- --watch=false
npm run lint
npm run build
```

No historical credentials from the APKs belong in this repository.
