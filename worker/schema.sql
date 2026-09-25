-- D1 schema for push notifications (binding DB in wrangler.toml).
-- Apply from worker/: wrangler d1 execute nerdiversary-db --remote --file=./schema.sql
-- Every statement is IF NOT EXISTS, so re-running it is safe. It does not
-- alter existing tables: add a new column to a live database with ALTER TABLE.

-- One row per browser push subscription. Re-subscribing from the same browser
-- upserts the row and replaces its family_members.
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                    -- First 32 hex chars of SHA-256(endpoint)
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,                   -- Client public key for payload encryption
  auth TEXT NOT NULL,                     -- Client auth secret for payload encryption
  notification_times TEXT DEFAULT '[1440,60,0]',  -- JSON array: send this many minutes before each event
  timezone TEXT DEFAULT 'UTC',            -- IANA zone; shared holidays fire at local midnight
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT                         -- Set when the push service returns 404/410; the cron skips these rows
);

-- People whose milestones a subscription gets notified about.
CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,
  name TEXT NOT NULL,
  birth_datetime TEXT NOT NULL,           -- UTC, YYYY-MM-DDTHH:MM (minute precision)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_birth_datetime ON family_members(birth_datetime);
CREATE INDEX IF NOT EXISTS idx_subscription_id ON family_members(subscription_id);

-- Every push that was sent. Read via GET /push/notification-log (needs
-- ADMIN_TOKEN). The cron deletes rows older than 90 days at 00:00 UTC.
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
