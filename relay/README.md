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
     `wrangler d1 execute body_metrics_relay --command "CREATE TABLE IF NOT EXISTS shared_entries (user_id TEXT NOT NULL, entry_id TEXT NOT NULL, measured_at TEXT NOT NULL, date_local TEXT, weight_kg REAL, waist_cm REAL, updated_at TEXT NOT NULL, is_deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, entry_id))"`
     `wrangler d1 execute body_metrics_relay --command "CREATE INDEX IF NOT EXISTS idx_shared_entries_user_updated ON shared_entries(user_id, updated_at)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE TABLE IF NOT EXISTS reminder_schedules (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, message TEXT NOT NULL, time_local TEXT NOT NULL, days_json TEXT NOT NULL, timezone TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, next_fire_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user ON reminder_schedules(user_id)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE INDEX IF NOT EXISTS idx_reminder_schedules_next ON reminder_schedules(enabled, next_fire_at)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE TABLE IF NOT EXISTS push_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, endpoint TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, url TEXT NOT NULL, tag TEXT, created_at TEXT NOT NULL, delivered_at TEXT)"`
     `wrangler d1 execute body_metrics_relay --command "CREATE INDEX IF NOT EXISTS idx_push_messages_endpoint ON push_messages(endpoint, delivered_at)"`

## Web Push setup
1) Generate VAPID keys:
   - `npx web-push generate-vapid-keys`
2) Set the public key in `relay/wrangler.toml` (`VAPID_PUBLIC_KEY`).
3) Store the private key as a secret:
   - `wrangler secret put VAPID_PRIVATE_KEY`
4) (Optional) Set the subject:
   - `wrangler secret put VAPID_SUBJECT`

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
