-- Cloudflare D1 schema for Body Metrics Tracker relay

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  friend_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_b64 TEXT,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS share_settings (
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  share_weight INTEGER NOT NULL DEFAULT 0,
  share_waist INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS status_updates (
  user_id TEXT PRIMARY KEY,
  logged_today INTEGER NOT NULL,
  last_entry_date TEXT,
  weight_kg REAL,
  waist_cm REAL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_entries (
  user_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  measured_at TEXT NOT NULL,
  date_local TEXT,
  weight_kg REAL,
  waist_cm REAL,
  note TEXT,
  updated_at TEXT NOT NULL,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_shared_entries_user_updated
  ON shared_entries(user_id, updated_at);

CREATE TABLE IF NOT EXISTS profile_settings (
  user_id TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS reminder_schedules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  time_local TEXT NOT NULL,
  days_json TEXT NOT NULL,
  timezone TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  next_fire_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user
  ON reminder_schedules(user_id);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_next
  ON reminder_schedules(enabled, next_fire_at);

CREATE TABLE IF NOT EXISTS push_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT NOT NULL,
  tag TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_messages_endpoint
  ON push_messages(endpoint, delivered_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);
