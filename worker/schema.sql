-- Nerdiversary Push Notifications Schema
-- Run with: wrangler d1 execute nerdiversary-db --file=./schema.sql

-- Subscriptions table: stores push subscription endpoints
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                    -- Hash of endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,                   -- Push encryption key
  auth TEXT NOT NULL,                     -- Push auth secret
  notification_times TEXT DEFAULT '[1440,60,0]',  -- JSON array of minutes before
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Family members table: stores birthdates for milestone calculations
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_datetime TEXT NOT NULL,           -- ISO format: YYYY-MM-DDTHH:MM
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

-- Index for fast birthday lookups (the key optimization!)
CREATE INDEX IF NOT EXISTS idx_birth_datetime ON family_members(birth_datetime);

-- Index for cleanup by subscription
CREATE INDEX IF NOT EXISTS idx_subscription_id ON family_members(subscription_id);

-- Notification log: persistent record of every sent push notification
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
