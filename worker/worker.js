/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 * Handles push notification subscriptions with D1 database
 *
 * Architecture: Birthday-indexed D1 queries (scales to 1M+ users)
 * - On subscribe: store subscription + family birthdates in D1
 * - Every minute: query birthdates matching any milestone offset, send notifications
 * - Cost: ~1 query/minute regardless of user count
 */

// Import shared modules
import Calculator from '../js/calculator.js';
import { parseFamilyParam, formatNotificationTitle, generateICal, SITE_URL } from '../js/shared.js';

// ============================================================================
// CORS Headers
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================================================
// MILESTONE OFFSETS (precomputed for cron queries)
// ============================================================================

/**
 * Generate all milestone offsets in milliseconds from birth.
 * Uses Calculator.calculate() with a reference date to match the frontend exactly,
 * except for Earth birthdays (approximated with MS_PER_YEAR) and nerdy holidays
 * (calendar-based, not offset-based — skipped for now).
 */
// Exported for tests
export function generateMilestoneOffsets() {
  const refBirth = new Date('2000-01-01T00:00:00Z');
  const events = Calculator.calculate(refBirth, { yearsAhead: 120, includePast: true });

  // Distinct milestones can land on the same minute (e.g. "1 AU" and
  // "Light Speed to the Sun", or 0xFFFFFF vs 2^24 seconds after rounding).
  // Merge them into one notification instead of silently dropping all but one.
  const byMs = new Map();
  for (const event of events) {
    // Skip calendar-based events that can't be expressed as fixed offsets
    if (event.isSharedHoliday) continue;
    if (event.id.startsWith('earth-birthday-')) continue;

    const ms = event.date.getTime() - refBirth.getTime();
    if (ms <= 0) continue;

    // Round to nearest minute for consistent matching with minute-precision birth_datetime in DB
    const msRounded = Math.round(ms / 60000) * 60000;
    const existing = byMs.get(msRounded);
    if (existing) {
      if (!existing.labels.includes(event.title)) {
        existing.labels.push(event.title);
      }
    } else {
      byMs.set(msRounded, { labels: [event.title], icon: event.icon });
    }
  }

  // Earth birthdays and nerdy holidays are calendar-based (same month/day each year),
  // not fixed offsets. They are handled separately via handleCalendarEvents().

  return [...byMs.entries()].map(([ms, o]) => ({ ms, label: o.labels.join(' + '), icon: o.icon }));
}

// Cache milestone offsets (generated once per worker instance)
let MILESTONE_OFFSETS = null;
function getMilestoneOffsets() {
  if (!MILESTONE_OFFSETS) {
    MILESTONE_OFFSETS = generateMilestoneOffsets();
  }
  return MILESTONE_OFFSETS;
}

// ============================================================================
// WORKER HANDLER
// ============================================================================

const workerHandler = {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Route push notification endpoints
    if (url.pathname === '/push/vapid-public-key') {
      return handleVapidPublicKey(env);
    }

    if (url.pathname === '/push/subscribe' && request.method === 'POST') {
      return handlePushSubscribe(request, env);
    }

    if (url.pathname === '/push/unsubscribe' && request.method === 'POST') {
      return handlePushUnsubscribe(request, env);
    }

    if (url.pathname === '/push/notification-log' && request.method === 'GET') {
      return handleNotificationLog(request, url, env);
    }

    // Milestone share pages: social scrapers get real OG tags, humans get redirected
    if (url.pathname === '/share') {
      return handleShareRedirect(url);
    }

    // Calendar feed - require family format
    const familyParam = url.searchParams.get('family');
    if (familyParam) {
      return handleFamilyRequest(url, familyParam);
    }

    // No valid parameters provided
    return new Response(JSON.stringify({
      error: 'Missing family parameter',
      usage: '?family=Name|YYYY-MM-DD or ?family=Name|YYYY-MM-DD,Name2|YYYY-MM-DD',
      example: url.origin + '/?family=Alice|1990-05-15'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  },
};

// ============================================================================
// MILESTONE SHARE PAGES
// ============================================================================

/** Escape text for safe interpolation into HTML (params are user-controlled) */
function escapeHtmlText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Categories that have a pre-rendered OG card in assets/og/
const OG_CARD_CATEGORIES = new Set([
  'planetary', 'decimal', 'binary', 'mathematical', 'fibonacci', 'scientific', 'pop-culture'
]);

/**
 * Build the share-page HTML for one milestone. GitHub Pages can't emit per-URL
 * meta tags and scrapers don't run JS, so shared links route through the
 * worker: bots read the OG tags, humans get redirected to the results page.
 * Query params: t=title, d=ISO date, i=icon emoji, c=category, n=person name,
 * f=family param (redirect target on the site — never an arbitrary URL).
 * Exported for tests.
 */
export function buildSharePage(url) {
  const title = (url.searchParams.get('t') || 'A nerdy milestone').slice(0, 120);
  const icon = (url.searchParams.get('i') || '🎉').slice(0, 8);
  const name = (url.searchParams.get('n') || '').slice(0, 60);
  const category = url.searchParams.get('c') || '';
  const familyParam = url.searchParams.get('f') || '';

  const date = new Date(url.searchParams.get('d') || '');
  const dateStr = isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  // Redirect target is always our results page — f is data, not a URL
  const target = familyParam
    ? `${SITE_URL}results.html?family=${encodeURIComponent(familyParam)}`
    : SITE_URL;

  const ogTitle = `${icon} ${name ? `${name} reaches` : 'Countdown to'} ${title}${dateStr ? ` on ${dateStr}` : ''}!`;
  const ogImage = `${SITE_URL}assets/og/${OG_CARD_CATEGORIES.has(category) ? category : 'default'}.jpg`;
  const ogDescription = 'Nerdiversary finds your billion-second birthday, planetary years, and other gloriously nerdy milestones.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtmlText(ogTitle)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtmlText(ogTitle)}">
<meta property="og:description" content="${escapeHtmlText(ogDescription)}">
<meta property="og:image" content="${escapeHtmlText(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="description" content="${escapeHtmlText(ogDescription)}">
<meta http-equiv="refresh" content="0;url=${escapeHtmlText(target)}">
</head>
<body>
<p>Redirecting to <a href="${escapeHtmlText(target)}">Nerdiversary</a>…</p>
<script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;

  return html;
}

function handleShareRedirect(url) {
  return new Response(buildSharePage(url), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// ============================================================================
// PUSH NOTIFICATION HANDLERS (D1-based)
// ============================================================================

/**
 * Return VAPID public key for push subscription
 */
function handleVapidPublicKey(env) {
  const publicKey = env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response(JSON.stringify({
      error: 'Push notifications not configured',
      message: 'VAPID keys not set up on server'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/**
 * Handle push subscription - stores in D1
 */
async function handlePushSubscribe(request, env) {
  // Check if D1 is configured
  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'Push notifications not configured',
      message: 'D1 database not set up'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { subscription, family, notificationTimes, timezoneOffset, timezone } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({
        error: 'Invalid subscription',
        message: 'Missing subscription endpoint'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Generate subscription ID from endpoint hash
    const subscriptionId = await hashEndpoint(subscription.endpoint);
    const times = JSON.stringify(notificationTimes || [1440, 60, 0]);

    // Upsert subscription (clear deleted_at on re-subscribe)
    const tz = timezone || 'UTC';
    await env.DB.prepare(`
      INSERT INTO subscriptions (id, endpoint, p256dh, auth, notification_times, timezone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        endpoint = excluded.endpoint,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        notification_times = excluded.notification_times,
        timezone = excluded.timezone,
        updated_at = datetime('now'),
        deleted_at = NULL
    `).bind(
      subscriptionId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      times,
      tz
    ).run();

    // Delete existing family members for this subscription
    await env.DB.prepare('DELETE FROM family_members WHERE subscription_id = ?')
      .bind(subscriptionId)
      .run();

    // Parse and insert family members
    // Use timezone offset to convert local times to UTC for consistent event calculation
    // Cap member count and name length — the cron scans every row each minute,
    // so unbounded input from this public endpoint could degrade it for everyone
    if (family) {
      const members = parseFamilyParam(family).slice(0, 20);
      const offset = typeof timezoneOffset === 'number' ? timezoneOffset : 0;
      for (const member of members) {
        const birthDatetime = formatBirthDatetime(member.dateStr, member.timeStr, offset);
        await env.DB.prepare(`
          INSERT INTO family_members (subscription_id, name, birth_datetime)
          VALUES (?, ?, ?)
        `).bind(subscriptionId, member.name.slice(0, 100), birthDatetime).run();
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e) {
    console.error('Subscribe error:', e);
    return new Response(JSON.stringify({
      error: 'Failed to save subscription',
      message: e.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/**
 * Handle push unsubscription
 */
async function handlePushUnsubscribe(request, env) {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { endpoint } = await request.json();
    const subscriptionId = await hashEndpoint(endpoint);

    // Delete cascade will remove family_members too
    await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?')
      .bind(subscriptionId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/**
 * Return recent notification log entries.
 * Debug endpoint — contains every user's name and notification history, so it
 * requires an admin token: set with `wrangler secret put ADMIN_TOKEN` and call
 * with `Authorization: Bearer <token>`.
 */
async function handleNotificationLog(request, url, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Requires Authorization: Bearer <ADMIN_TOKEN>'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000);
    const result = await env.DB.prepare(
      'SELECT id, subscription_id, person_name, title, body, sent_at FROM notification_log ORDER BY sent_at DESC LIMIT ?'
    ).bind(limit).all();

    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/**
 * Hash endpoint to create subscription ID
 */
async function hashEndpoint(endpoint) {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Format birth date to YYYY-MM-DDTHH:MM for DB storage (in UTC)
 * The client converts local birth times to UTC before sending (accounting for
 * historical DST on the birth date), so timezoneOffset is typically 0.
 * Kept for backwards compatibility with older clients that send local times.
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:MM format (UTC if client converts, local if legacy)
 * @param {number} timezoneOffset - Minutes to add to convert to UTC (0 if already UTC)
 * @returns {string} UTC datetime in YYYY-MM-DDTHH:MM format
 */
function formatBirthDatetime(dateStr, timeStr, timezoneOffset = 0) {
  const asUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const utcDate = new Date(asUtc.getTime() + timezoneOffset * 60 * 1000);
  return utcDate.toISOString().slice(0, 16);
}

// ============================================================================
// SCHEDULED HANDLER - Birthday-indexed queries
// ============================================================================

/**
 * Parse a subscription row's notification_times JSON.
 * Defensive: one corrupt row must not crash the whole cron run.
 */
function parseNotificationTimes(row) {
  try {
    const times = parseNotificationTimes(row);
    return Array.isArray(times) ? times : [1440, 60, 0];
  } catch {
    return [1440, 60, 0];
  }
}

/**
 * Scheduled handler - runs every minute
 * Queries D1 for birthdates matching any milestone offset
 */
async function handleScheduled(env) {
  if (!env.DB || !env.VAPID_PRIVATE_KEY) {
    console.log('Push notifications not configured - skipping');
    return;
  }

  const now = new Date();
  // Truncate to start of current minute for deterministic matching
  // Without this, sub-second cron jitter can shift target birthdates into the wrong minute
  now.setSeconds(0, 0);
  const currentMinute = now.toISOString().slice(0, 16); // "2024-01-15T10:30"
  console.log(`Checking notifications for ${currentMinute}`);

  const offsets = getMilestoneOffsets();
  const notificationTimes = [0, 60, 1440]; // At event, 1 hour before, 1 day before

  // Fetch ALL family members once (typically few rows), then match in-memory
  // This avoids 26+ D1 queries that were causing CPU limit exceeded errors
  const allMembers = await env.DB.prepare(`
    SELECT fm.name, fm.birth_datetime, s.id as subscription_id, s.endpoint, s.p256dh, s.auth, s.notification_times
    FROM family_members fm
    JOIN subscriptions s ON fm.subscription_id = s.id
    WHERE s.deleted_at IS NULL
  `).all();

  const members = allMembers.results || [];
  console.log(`Checking ${members.length} family members against ${offsets.length} offsets`);

  let totalNotifications = 0;
  const logEntries = [];

  // Build a Map from offset ms -> offset info for O(1) lookup
  const offsetMap = new Map();
  for (const offset of offsets) {
    offsetMap.set(offset.ms, offset);
  }

  // For each member, check if their birth datetime matches any milestone offset
  for (const row of members) {
    const birthMs = new Date(row.birth_datetime + ':00Z').getTime();
    const times = parseNotificationTimes(row);

    for (const notifMinutes of notificationTimes) {
      if (!times.includes(notifMinutes)) continue;

      // milestone_offset = now + notifLeadTime - birthTime
      const elapsedMs = now.getTime() - birthMs + (notifMinutes * 60 * 1000);
      const offset = offsetMap.get(elapsedMs);

      if (offset) {
        const { title, body } = generateNotificationContent(
          row.name,
          offset,
          notifMinutes
        );

        const subscription = {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth }
        };

        const success = await sendPushNotification(subscription, { title, body }, env, row.subscription_id, notifMinutes);
        if (success) {
          totalNotifications++;
          logEntries.push({ subscriptionId: row.subscription_id, personName: row.name, title, body });
          console.log(`Sent: ${title} to ${row.name}`);
        }
      }
    }
  }

  // Handle calendar-based events (earth birthdays + nerdy holidays) using shared Calculator
  totalNotifications += await handleCalendarEvents(env, now, notificationTimes, logEntries);

  // Batch-insert notification log entries
  if (logEntries.length > 0) {
    const stmts = logEntries.map(e =>
      env.DB.prepare(
        'INSERT INTO notification_log (subscription_id, person_name, title, body) VALUES (?, ?, ?, ?)'
      ).bind(e.subscriptionId, e.personName, e.title, e.body)
    );
    await env.DB.batch(stmts);
  }

  // Prune old log entries once a day so the table doesn't grow unbounded
  if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
    await env.DB.prepare(
      "DELETE FROM notification_log WHERE sent_at < datetime('now', '-90 days')"
    ).run();
  }

  console.log(`Sent ${totalNotifications} notifications`);
}

/**
 * Handle calendar-based events using shared Calculator.
 * Two sub-paths:
 *   1. Earth birthdays — fire at the user's birth time (UTC)
 *   2. Shared holidays — fire at midnight in the user's local timezone
 */
async function handleCalendarEvents(env, now, notificationTimes, logEntries) {
  let totalNotifications = 0;

  // --- Earth birthdays: match on birth HH:MM ---
  for (const notifMinutes of notificationTimes) {
    const eventTime = new Date(now.getTime() + notifMinutes * 60 * 1000);
    const eventHHMM = eventTime.toISOString().slice(11, 16);

    const result = await env.DB.prepare(`
      SELECT fm.name, fm.birth_datetime, s.id as subscription_id, s.endpoint, s.p256dh, s.auth, s.notification_times
      FROM family_members fm
      JOIN subscriptions s ON fm.subscription_id = s.id
      WHERE s.deleted_at IS NULL AND SUBSTR(fm.birth_datetime, 12, 5) = ?
    `).bind(eventHHMM).all();

    if (!result.results) continue;

    for (const row of result.results) {
      const times = parseNotificationTimes(row);
      if (!times.includes(notifMinutes)) continue;

      const birthDate = new Date(row.birth_datetime + ':00Z');
      const events = Calculator.getEarthBirthdayAt(birthDate, eventTime);

      for (const event of events) {
        totalNotifications += await sendCalendarNotification(
          row, event, notifMinutes, env, logEntries
        );
      }
    }
  }

  // --- Shared holidays: match on midnight in user's local timezone ---
  // Get all active subscriptions once (deduplicated — one notification per subscription, not per family member)
  const subsResult = await env.DB.prepare(`
    SELECT DISTINCT s.id as subscription_id, s.endpoint, s.p256dh, s.auth, s.notification_times, s.timezone,
      (SELECT fm.name FROM family_members fm WHERE fm.subscription_id = s.id LIMIT 1) as name
    FROM subscriptions s
    WHERE s.deleted_at IS NULL
  `).all();
  const subscribers = subsResult.results || [];

  for (const notifMinutes of notificationTimes) {
    const eventTime = new Date(now.getTime() + notifMinutes * 60 * 1000);

    for (const row of subscribers) {
      const times = parseNotificationTimes(row);
      if (!times.includes(notifMinutes)) continue;

      // Check if eventTime is midnight (00:00) in the user's timezone
      const tz = row.timezone || 'UTC';
      const localHHMM = eventTime.toLocaleString('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      });
      if (localHHMM !== '00:00') continue;

      // Build a UTC date for the local date (for month/day matching)
      const localDateStr = eventTime.toLocaleString('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const localDate = new Date(localDateStr + 'T00:00:00Z');

      const holidays = Calculator.getHolidaysAt(localDate);
      for (const event of holidays) {
        totalNotifications += await sendCalendarNotification(
          row, event, notifMinutes, env, logEntries
        );
      }
    }
  }

  return totalNotifications;
}

async function sendCalendarNotification(row, event, notifMinutes, env, logEntries) {
  const { title, body } = generateNotificationContent(
    row.name, { label: event.title, icon: event.icon }, notifMinutes
  );
  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth }
  };
  const success = await sendPushNotification(subscription, { title, body }, env, row.subscription_id, notifMinutes);
  if (success) {
    logEntries.push({ subscriptionId: row.subscription_id, personName: row.name, title, body });
    console.log(`Sent: ${title} to ${row.name}`);
    return 1;
  }
  return 0;
}

/**
 * Generate notification content
 */
function generateNotificationContent(personName, offset, minutesBefore) {
  const title = formatNotificationTitle(offset.icon, minutesBefore);
  const body = `${personName}: ${offset.label}`;
  return { title, body };
}

// ============================================================================
// WEB PUSH IMPLEMENTATION
// ============================================================================

async function sendPushNotification(subscription, payload, env, subscriptionId = null, minutesBefore = 0) {
  try {
    const vapidHeaders = await createVapidHeaders(subscription.endpoint, env);
    const encryptedPayload = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    // TTL = time until the notification becomes stale
    // 1-day alert: useful for up to 23 hours; 1-hour: up to 59 min; at-time: 10 min
    const ttl = minutesBefore > 0 ? (minutesBefore - 1) * 60 : 600;

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': String(ttl),
        'Urgency': 'normal',
        ...vapidHeaders
      },
      body: encryptedPayload
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    if (response.status === 404 || response.status === 410) {
      console.log(`Subscription expired (${response.status}), soft-deleting`);
      if (subscriptionId && env.DB) {
        await env.DB.prepare(
          "UPDATE subscriptions SET deleted_at = datetime('now') WHERE id = ?"
        ).bind(subscriptionId).run();
      }
      return false;
    }

    console.error(`Push failed: ${response.status}`);
    return false;
  } catch (error) {
    console.error('Push error:', error);
    return false;
  }
}

async function createVapidHeaders(endpoint, env) {
  const vapidSubject = env.VAPID_SUBJECT || 'mailto:nerdiversary@example.com';
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { aud: audience, exp: now + 12 * 60 * 60, sub: vapidSubject };

  const jwt = await signJWT(header, jwtPayload, privateKey);
  return { 'Authorization': `vapid t=${jwt}, k=${publicKey}` };
}

async function signJWT(header, payload, privateKeyBase64) {
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // web-push generates raw 32-byte EC private keys, wrap in PKCS8 for import
  const privateKeyRaw = base64urlDecode(privateKeyBase64);
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyRaw.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyRaw, pkcs8Header.length);

  const privateKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8Key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Web Crypto returns raw r||s format (64 bytes), which is what JWT expects
  return `${unsignedToken}.${base64urlEncode(new Uint8Array(signature))}`;
}

async function encryptPayload(payload, p256dhBase64, authBase64) {
  const p256dh = base64urlDecode(p256dhBase64);
  const auth = base64urlDecode(authBase64);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );

  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);

  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey, 256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await deriveIKM(new Uint8Array(sharedSecret), auth, localPublicKeyBytes, p256dh);
  const contentEncryptionKey = await deriveKey(ikm, salt, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = await deriveKey(ikm, salt, 'Content-Encoding: nonce\0', 12);

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;

  const encryptionKey = await crypto.subtle.importKey(
    'raw', contentEncryptionKey, { name: 'AES-GCM' }, false, ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encryptionKey, paddedPayload
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, encrypted.byteLength + 86, false);

  const header = new Uint8Array(86);
  header.set(salt, 0);
  header.set(recordSize, 16);
  header[20] = 65;
  header.set(localPublicKeyBytes, 21);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header);
  result.set(new Uint8Array(encrypted), header.length);
  return result;
}

async function deriveIKM(sharedSecret, auth, localPublicKey, subscriberPublicKey) {
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits']
  );

  const infoPrefix = new TextEncoder().encode('WebPush: info\0');
  const info = new Uint8Array(infoPrefix.length + subscriberPublicKey.length + localPublicKey.length);
  info.set(infoPrefix, 0);
  info.set(subscriberPublicKey, infoPrefix.length);
  info.set(localPublicKey, infoPrefix.length + subscriberPublicKey.length);

  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: auth, info },
    sharedSecretKey, 256
  );
  return new Uint8Array(ikm);
}

async function deriveKey(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey(
    'raw', ikm, { name: 'HKDF' }, false, ['deriveBits']
  );
  const infoBytes = new TextEncoder().encode(info);
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: infoBytes },
    key, length * 8
  );
  return new Uint8Array(derived);
}

function base64urlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(input) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const decoded = atob(base64 + padding);
  return new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
}

// ============================================================================
// ICAL GENERATION
// ============================================================================

/**
 * Build the calendar-feed event list for a family.
 * Includes events from 30 days in the past to 2 years ahead of `now`
 * (yearsAhead in Calculator.calculate is measured from BIRTH, so the
 * window filter is what keeps the feed relevant for adults).
 * Shared holidays are deduplicated across members, and every other event
 * gets a per-person unique id so iCal UIDs don't collide in family feeds.
 * Exported for tests.
 */
export function buildFamilyEvents(members, now = new Date()) {
  const windowStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 2 * 365.2425 * 24 * 60 * 60 * 1000);

  let allEvents = [];
  const seenHolidays = new Set();

  for (const member of members) {
    const events = Calculator.calculate(member.birthDate, {
      yearsAhead: 120,
      includePast: true,
      transformEvent: event => {
        if (event.date < windowStart || event.date > windowEnd) { return null; }
        if (event.isSharedHoliday) {
          // Shared holidays are the same for everyone — include once, unprefixed
          if (seenHolidays.has(event.id)) { return null; }
          seenHolidays.add(event.id);
          return event;
        }
        // Person prefix on the title is added by generateICal for family feeds
        return {
          ...event,
          id: `${encodeURIComponent(member.name)}-${event.id}`,
          personName: member.name,
        };
      }
    });
    allEvents = allEvents.concat(events);
  }

  allEvents.sort((a, b) => a.date - b.date);
  return allEvents;
}

function handleFamilyRequest(url, familyParam) {
  const members = parseFamilyParam(familyParam);

  if (members.length === 0) {
    return new Response(JSON.stringify({
      error: 'Invalid family parameter format',
      usage: '?family=Name|YYYY-MM-DD|HH:MM',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const allEvents = buildFamilyEvents(members);

  const format = url.searchParams.get('format');
  if (format === 'json') {
    return new Response(JSON.stringify(allEvents.map(e => ({
      ...e,
      date: e.date.toISOString()
    }))), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  const ical = generateICal(allEvents, members.length > 1);
  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="nerdiversary.ics"',
      ...CORS_HEADERS,
    },
  });
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  ...workerHandler,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  }
};
