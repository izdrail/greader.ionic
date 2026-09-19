# Web feed proxy deployment

Browser builds send feed requests to a first-party proxy because publisher CORS rules often reject direct browser fetches. Native Android/iOS builds continue to use Capacitor HTTP.

## Primary: one Coolify container

Build the repository Dockerfile and expose port 3000. The Node service serves `www/` and `/api/feed` from one origin, so no browser CORS configuration is needed.

Controls: HTTP(S) only, ports 80/443 only, no URL credentials, DNS/IP private-range rejection, DNS-pinned request connection, each redirect revalidated, three redirects, 15-second timeout, 5 MB maximum, feed-like content types, fixed outbound headers, no forwarding of cookies or authorization.

## Alternate: Cloudflare Worker

1. Set `ALLOWED_ORIGIN` in `worker/wrangler.toml` to the exact public gReader web origin.
2. Run `npm run deploy:worker` after `wrangler login`.
3. Set `feedProxyUrl` in `src/environments/environment.prod.ts` to the deployed Worker URL before the web build.

The Worker applies URL/port/private-host checks, revalidates redirects, limits redirects/time/body size, fixes outbound headers, and allows only the configured browser origin. Cloudflare additionally blocks requests to its platform-restricted destinations. The same-service Node endpoint has stronger DNS pinning and is the recommended deployment.
