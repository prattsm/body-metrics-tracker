# Relay Service (Cloudflare Workers + D1)

This folder contains a minimal relay API for friend invites, status sharing, and reminders.

## Setup (one-time)
1) Install Wrangler: https://developers.cloudflare.com/workers/wrangler/
2) Create a D1 database:
   - `wrangler d1 create body_metrics_relay`
3) Update `relay/wrangler.toml` with the database ID.
4) Apply schema:
   - `wrangler d1 execute body_metrics_relay --file relay/schema.sql`
   - If upgrading an existing database, run:
     `wrangler d1 execute body_metrics_relay --command "ALTER TABLE users ADD COLUMN avatar_b64 TEXT"`

## Deploy
```
wrangler deploy relay/worker.js
```

## Configure the app
Set the relay URL before building the app (set `RELAY_URL` in `src/body_metrics_tracker/config.py`
or export `BMT_RELAY_URL` during the build).

## Security notes
- The relay issues a random token at registration. The token is stored locally in the encrypted data file.
- Tokens are hashed server-side and never stored in plaintext.
- All endpoints require HTTPS (the client enforces this).
- Share settings are enforced server-side (weight/waist only included if the sender allows).
