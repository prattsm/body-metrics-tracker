# Body Metrics Tracker PWA

This folder contains the iPhone-friendly PWA (Home Screen install).

## Deploy with Cloudflare Pages
1) Create a new Pages project from this repo.
2) Set the build output directory to `pwa`.
3) Deploy.

Once live:
- Open the URL in Safari on iPhone.
- Share → Add to Home Screen.
- Open from the icon and enable notifications.

## Local dev
Serve `pwa/` from any HTTPS origin. Push notifications require HTTPS and Home Screen install on iOS.

## Relay configuration
The PWA points to the relay at:
`https://body-metrics-relay.bodymetricstracker.workers.dev`

To change it, edit `pwa/app.js` and update `RELAY_URL`.
