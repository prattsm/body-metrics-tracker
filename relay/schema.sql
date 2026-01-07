-- Cloudflare D1 schema for Body Metrics Tracker relay

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  friend_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
