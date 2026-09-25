/**
 * Nerdiversary Cloudflare Worker: calendar feed, share-link previews and push
 * notifications. It imports the site's own Calculator and shared.js, so every
 * date it serves or pushes is computed by the same code as the results page.
 * Config, secrets and the cron schedule are in wrangler.toml.
 *
 * Routes
 *   GET  *?family=...[&format=json]  .ics feed (or JSON) for the family, from
 *                                    30 days ago to 2 years ahead
 *   GET  /share?t=&d=&i=&c=&n=&f=    link-preview page: OG tags for scrapers,
 *                                    redirect to results.html for people
 *   GET  /push/vapid-public-key      public key the browser subscribes with
 *   POST /push/subscribe             save a subscription and its family
 *   POST /push/unsubscribe           delete a subscription and its family
 *   GET  /push/notification-log      recent sends; needs Bearer ADMIN_TOKEN
 *   OPTIONS (any path)               CORS preflight
 *   anything else                    400 with usage help
 *   /push/vapid-public-key answers 503 without VAPID_PUBLIC_KEY, the other
 *   /push/* routes without the DB binding.
 *
 * D1 tables (binding DB, schema in schema.sql)
 *   subscriptions     one row per browser push endpoint; id is the first 32
 *                     hex chars of SHA-256(endpoint). /push/unsubscribe deletes
 *                     the row; a 404/410 from the push service only sets
 *                     deleted_at, and re-subscribing clears it.
 *   family_members    name + birth_datetime (UTC, "YYYY-MM-DDTHH:MM"), at most
 *                     20 per subscription, replaced wholesale on each subscribe.
 *   notification_log  one row per push the service accepted; rows older than
 *                     90 days are deleted by the 00:00 UTC cron run.
 *
 * Cron (every minute)
 *   Skipped unless both DB and VAPID_PRIVATE_KEY are set. Each run looks at
 *   the current UTC minute, reads all active family members, and sends what is
 *   due. There is no catch-up: a minute the cron misses sends nothing.
 *
 * Push timing
 *   Every lead time is checked each run: 1440 (a day before), 60 and 0 minutes.
 *   A subscription only gets the lead times listed in its notification_times.
 *   An event is due when (current minute + lead time) is its minute. Three
 *   kinds of event, found three ways:
 *   - Fixed-duration milestones (seconds, planet years, powers of two...):
 *     each is a constant offset from birth, so generateMilestoneOffsets()
 *     lists them once per isolate, rounded to the minute, and a member is due
 *     when now + lead - birth equals an offset. A milestone at 10:46:40 is
 *     sent in the 10:47 run.
 *   - Earth birthdays: not a fixed offset (leap days), so they match on the
 *     birth's UTC month, day and HH:MM instead.
 *   - Nerdy holidays: the same date for everyone, so they fire at 00:00 in
 *     the subscription's time zone (the browser's zone at subscribe time),
 *     once per subscription, with no person named.
 *   Birth times are stored in UTC to the minute. The browser converts from
 *   the birth time zone (with that date's DST) before posting, because
 *   subscribe ignores a zone in the family string. With no birth time a
 *   member counts as born at 00:00 in the browser's zone.
 *   Each push carries a TTL so a late delivery is dropped instead of shown
 *   stale: lead time minus one minute, or 10 minutes for "happening now".
 */

import Calculator from '../js/calculator.js';
import { parseFamilyParam, formatNotificationTitle, generateICal, escapeHtml, SITE_URL } from '../js/shared.js';

const FAMILY_USAGE = '?family=Name|YYYY-MM-DD, optionally |HH:MM (24-hour birth time) and |Area/City (birth time zone). Separate people with commas.';

// The site (GitHub Pages) calls these endpoints cross-origin. Nothing here
// uses cookies, so any origin is allowed.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================================================
// MILESTONE OFFSETS
// ============================================================================

/**
 * List every fixed-duration milestone as its offset from birth, in ms rounded
 * to the minute: [{ ms, label, icon }]. Computed by running Calculator.calculate
 * for a reference birth, which is valid because these milestones are the same
 * duration for every birth date. Earth birthdays and nerdy holidays depend on
 * the calendar, so they are left out and handled by handleCalendarEvents().
 * Exported for tests.
 */
export function generateMilestoneOffsets() {
  const refBirth = new Date('2000-01-01T00:00:00Z');
  const events = Calculator.calculate(refBirth, { yearsAhead: 120, includePast: true });

  // Distinct milestones can round to the same minute (0xFFFFFF and 2^24
  // seconds, for example). They share one notification with joined labels.
  const byMs = new Map();
  for (const event of events) {
    if (event.isSharedHoliday) continue;
    if (event.id.startsWith('earth-birthday-')) continue;

    const ms = event.date.getTime() - refBirth.getTime();
    if (ms <= 0) continue;

    // birth_datetime and the cron clock are whole minutes, so offsets must be too
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

  return [...byMs.entries()].map(([ms, o]) => ({ ms, label: o.labels.join(' + '), icon: o.icon }));
}

// Computed on first use and kept for the life of the isolate
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

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

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

    if (url.pathname === '/share') {
      return handleShareRedirect(url);
    }

    const familyParam = url.searchParams.get('family');
    if (familyParam) {
      return handleFamilyRequest(url, familyParam);
    }

    return new Response(JSON.stringify({
      error: 'Add a family parameter to get a calendar feed.',
      usage: FAMILY_USAGE,
      example: url.origin + '/?family=Alice|1990-05-15|08:30,Bob|1988-11-02'
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

// Categories with a card in assets/og/; must match CARDS in
// scripts/generate-og-cards.js. Any other category gets default.jpg.
const OG_CARD_CATEGORIES = new Set([
  'planetary', 'decimal', 'binary', 'mathematical', 'fibonacci', 'scientific', 'pop-culture'
]);

/**
 * Build the share-page HTML for one milestone. GitHub Pages serves the same
 * meta tags for every URL and scrapers don't run JS, so shared milestone links
 * point here: scrapers read the OG tags, browsers follow the redirect to the
 * results page.
 * Query params (all attacker-controlled, so escaped and length-capped):
 * t=title, d=ISO date, i=icon emoji, c=category (picks assets/og/<c>.jpg,
 * else default.jpg), n=person name, f=family param. f only fills the
 * results.html query string, so the redirect can never leave the site.
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

  const target = familyParam
    ? `${SITE_URL}results.html?family=${encodeURIComponent(familyParam)}`
    : SITE_URL;

  const ogTitle = name
    ? `${icon} ${name} reaches ${title}${dateStr ? ` on ${dateStr}` : ''}`
    : `${icon} ${title}${dateStr ? `: ${dateStr}` : ''}`;
  const ogImage = `${SITE_URL}assets/og/${OG_CARD_CATEGORIES.has(category) ? category : 'default'}.jpg`;
  const ogDescription = 'Enter a birth date to see when you turn 1 billion seconds old, have a birthday counted in Mars years, and hit round numbers in binary.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(ogTitle)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(ogTitle)}">
<meta property="og:description" content="${escapeHtml(ogDescription)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="description" content="${escapeHtml(ogDescription)}">
<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}">
</head>
<body>
<p>Opening <a href="${escapeHtml(target)}">Nerdiversary</a>…</p>
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

function handleVapidPublicKey(env) {
  const publicKey = env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response(JSON.stringify({
      error: 'Push notifications are unavailable.',
      message: 'The server has no VAPID_PUBLIC_KEY set.'
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
 * Body: { subscription, family, notificationTimes, timezoneOffset, timezone }.
 * family is the site's family string with birth times already in UTC;
 * timezone is the browser's IANA zone, used for nerdy-holiday timing.
 */
async function handlePushSubscribe(request, env) {
  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'Push notifications are unavailable.',
      message: 'The server has no D1 database bound as DB.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { subscription, family, notificationTimes, timezoneOffset, timezone } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({
        error: 'Invalid subscription.',
        message: 'The subscription has no endpoint.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const subscriptionId = await hashEndpoint(subscription.endpoint);
    const times = JSON.stringify(notificationTimes || [1440, 60, 0]);

    // Re-subscribing revives a row the cron had soft-deleted
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

    await env.DB.prepare('DELETE FROM family_members WHERE subscription_id = ?')
      .bind(subscriptionId)
      .run();

    // Capped because the cron scans every row each minute and this endpoint
    // is public: one oversized family would slow the run for everyone.
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
      error: 'Could not save the subscription.',
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
    return new Response(JSON.stringify({
      error: 'Push notifications are unavailable.',
      message: 'The server has no D1 database bound as DB.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const { endpoint } = await request.json();
    const subscriptionId = await hashEndpoint(endpoint);

    // ON DELETE CASCADE removes the family_members and notification_log rows
    await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?')
      .bind(subscriptionId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Could not remove the subscription.', message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/**
 * Newest notification_log rows, ?limit= up to 1000 (default 100).
 * The log holds every user's names, so this needs the ADMIN_TOKEN secret sent
 * as `Authorization: Bearer <token>`; with no secret set it always answers 403.
 */
async function handleNotificationLog(request, url, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({
      error: 'Unauthorized.',
      message: 'Send the header Authorization: Bearer <ADMIN_TOKEN>.'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'Push notifications are unavailable.',
      message: 'The server has no D1 database bound as DB.'
    }), {
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
    return new Response(JSON.stringify({ error: 'Could not read the notification log.', message: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

/** Subscription id: first 32 hex chars of SHA-256(endpoint). */
async function hashEndpoint(endpoint) {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

/**
 * Build the birth_datetime column value. The site sends times already in UTC
 * with timezoneOffset 0; a client that sends local times passes the minutes
 * to add to reach UTC.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:MM
 * @param {number} timezoneOffset - minutes to add to reach UTC
 * @returns {string} UTC "YYYY-MM-DDTHH:MM"
 */
function formatBirthDatetime(dateStr, timeStr, timezoneOffset = 0) {
  const asUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const utcDate = new Date(asUtc.getTime() + timezoneOffset * 60 * 1000);
  return utcDate.toISOString().slice(0, 16);
}

// ============================================================================
// SCHEDULED HANDLER (timing rules are in the header comment)
// ============================================================================

/**
 * A subscription's lead times in minutes. Falls back to the default rather
 * than throwing, so one corrupt row cannot stop the run for everyone.
 */
function parseNotificationTimes(row) {
  try {
    const times = JSON.parse(row.notification_times);
    return Array.isArray(times) ? times : [1440, 60, 0];
  } catch {
    return [1440, 60, 0];
  }
}

/** One cron run. Exported so tests can pass a fake env and clock. */
export async function handleScheduled(env, now = new Date()) {
  if (!env.DB || !env.VAPID_PRIVATE_KEY) {
    console.log('Push notifications not configured - skipping');
    return;
  }

  now = new Date(now);
  // Cron start time jitters by seconds; matching is by whole minute
  now.setSeconds(0, 0);
  const currentMinute = now.toISOString().slice(0, 16); // "2024-01-15T10:30"
  console.log(`Checking notifications for ${currentMinute}`);

  const offsets = getMilestoneOffsets();
  const notificationTimes = [0, 60, 1440]; // lead times in minutes

  // One query for everyone, matched in memory against ~1,500 offsets. A query
  // per offset would cost far more D1 round trips and Worker CPU per run.
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

  const offsetMap = new Map();
  for (const offset of offsets) {
    offsetMap.set(offset.ms, offset);
  }

  for (const row of members) {
    const birthMs = new Date(row.birth_datetime + ':00Z').getTime();
    const times = parseNotificationTimes(row);

    for (const notifMinutes of notificationTimes) {
      if (!times.includes(notifMinutes)) continue;

      // How old the member will be when this lead time runs out
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

  totalNotifications += await handleCalendarEvents(env, now, notificationTimes, logEntries);

  if (logEntries.length > 0) {
    const stmts = logEntries.map(e =>
      env.DB.prepare(
        'INSERT INTO notification_log (subscription_id, person_name, title, body) VALUES (?, ?, ?, ?)'
      ).bind(e.subscriptionId, e.personName, e.title, e.body)
    );
    await env.DB.batch(stmts);
  }

  // Once a day, keep the log to 90 days
  if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
    await env.DB.prepare(
      "DELETE FROM notification_log WHERE sent_at < datetime('now', '-90 days')"
    ).run();
  }

  console.log(`Sent ${totalNotifications} notifications`);
}

/**
 * Send the events that repeat on a calendar date rather than after a fixed
 * duration. Returns the number of pushes sent and appends to logEntries.
 *   Earth birthdays: due when now + lead has the birth's UTC month, day and
 *     HH:MM. The SQL filters on HH:MM; Calculator checks the date.
 *   Nerdy holidays: due when now + lead is 00:00 in the subscription's time
 *     zone; sent once per subscription, not once per family member.
 */
async function handleCalendarEvents(env, now, notificationTimes, logEntries) {
  let totalNotifications = 0;

  // Earth birthdays
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

  // Nerdy holidays
  const subsResult = await env.DB.prepare(`
    SELECT s.id as subscription_id, s.endpoint, s.p256dh, s.auth, s.notification_times, s.timezone
    FROM subscriptions s
    WHERE s.deleted_at IS NULL
  `).all();
  const subscribers = subsResult.results || [];

  for (const notifMinutes of notificationTimes) {
    const eventTime = new Date(now.getTime() + notifMinutes * 60 * 1000);

    for (const row of subscribers) {
      const times = parseNotificationTimes(row);
      if (!times.includes(notifMinutes)) continue;

      const tz = row.timezone || 'UTC';
      const localHHMM = eventTime.toLocaleString('en-GB', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      });
      if (localHHMM !== '00:00') continue;

      // getHolidaysAt reads UTC month/day, so express the local date as UTC midnight
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
  // Nerdy holidays are for everyone, so they name no one, in the push or in
  // the log (person_name is NOT NULL, hence '' rather than null)
  const personName = event.isSharedHoliday ? '' : row.name;
  const { title, body } = generateNotificationContent(
    personName, { label: event.title, icon: event.icon }, notifMinutes
  );
  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth }
  };
  const success = await sendPushNotification(subscription, { title, body }, env, row.subscription_id, notifMinutes);
  if (success) {
    logEntries.push({ subscriptionId: row.subscription_id, personName, title, body });
    console.log(`Sent: ${title} to ${row.subscription_id}`);
    return 1;
  }
  return 0;
}

/** Push payload: title says when (icon + lead time), body says who and what. */
function generateNotificationContent(personName, offset, minutesBefore) {
  const title = formatNotificationTitle(offset.icon, minutesBefore);
  const body = personName ? `${personName}: ${offset.label}` : offset.label;
  return { title, body };
}

// ============================================================================
// WEB PUSH: RFC 8291 payload encryption and RFC 8292 VAPID auth, written on
// Web Crypto so the Worker has no dependencies.
// ============================================================================

/**
 * Encrypt and POST one push. Returns true when the push service accepts it.
 * A 404 or 410 means the browser dropped the subscription, so the row is
 * soft-deleted and the cron stops sending to it.
 */
async function sendPushNotification(subscription, payload, env, subscriptionId = null, minutesBefore = 0) {
  try {
    const vapidHeaders = await createVapidHeaders(subscription.endpoint, env);
    const encryptedPayload = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    // Seconds the push service may hold an undelivered push before dropping it:
    // until one minute before the event, or 10 minutes for "happening now"
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

  // `npx web-push generate-vapid-keys` prints a raw 32-byte P-256 scalar;
  // Web Crypto only imports private keys as PKCS8 (or JWK), so prepend the
  // fixed PKCS8 prefix for a P-256 key.
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

  // Web Crypto signs as raw r||s (64 bytes), the format ES256 JWTs use
  return `${unsignedToken}.${base64urlEncode(new Uint8Array(signature))}`;
}

/** aes128gcm body per RFC 8291: an 86-byte header then one encrypted record. */
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
  // Plaintext + 0x02 (last-record delimiter). The extra trailing zero byte
  // is padding, which the receiver strips.
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

  // salt(16) | record size(4) | key id length(1) = 65 | our public key(65)
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

/** RFC 8291 input keying material: HKDF over the ECDH secret, salted with auth. */
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

/** HKDF-SHA-256 of `length` bytes; derives the content key and the nonce. */
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
 * Build the calendar-feed event list for a family, sorted by date.
 * Keeps events from 30 days before `now` to 2 years after. Calculator's
 * yearsAhead counts from birth, not from now, so this window is what bounds
 * the feed. Nerdy holidays appear once for the family; every other event id
 * is prefixed with the person's name so iCal UIDs stay unique per person.
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
          if (seenHolidays.has(event.id)) { return null; }
          seenHolidays.add(event.id);
          return event;
        }
        // generateICal adds the name to the title when the feed has several people
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

/**
 * Serve the family feed as .ics, or as JSON with ?format=json. A birth time
 * with no zone in the family string is read as UTC (the Workers runtime zone).
 */
function handleFamilyRequest(url, familyParam) {
  const members = parseFamilyParam(familyParam);

  if (members.length === 0) {
    return new Response(JSON.stringify({
      error: 'No valid person in the family parameter. Each person needs a name and a YYYY-MM-DD date.',
      usage: FAMILY_USAGE,
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
