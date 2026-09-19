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

## Web deployment

The included Dockerfile serves the Ionic build and the guarded `/api/feed` endpoint on port 3000. A Cloudflare Worker alternate is documented in `docs/web-deployment.md`.

## Docker

The canonical image is `izdrail/greaderapp.com:latest` and serves the web app plus guarded feed APIs on port 3000.

```bash
make image              # docker build -t izdrail/greaderapp.com:latest .
make up                 # build and start with Docker Compose
make logs
make down
```

Override without editing files: `TAG=2026.09 make image`, `PORT=8080 make up`, or `IMAGE=registry.example/greader TAG=dev make up`.
