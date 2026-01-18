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
import Milestones from '../js/milestones.js';

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
 * Generate all milestone offsets in milliseconds from birth
 * These are the fixed offsets we check against birthdates
 */
function generateMilestoneOffsets() {
  const offsets = [];
  const { MS_PER_SECOND, MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY, MS_PER_WEEK, MS_PER_MONTH, MS_PER_YEAR } = Milestones;

  // Second milestones
  for (const m of Milestones.secondMilestones) {
    offsets.push({ ms: m.value * MS_PER_SECOND, label: m.label, icon: '⏱️' });
  }

  // Minute milestones
  for (const m of Milestones.minuteMilestones) {
    offsets.push({ ms: m.value * MS_PER_MINUTE, label: m.label, icon: '⏱️' });
  }

  // Hour milestones
  for (const m of Milestones.hourMilestones) {
    offsets.push({ ms: m.value * MS_PER_HOUR, label: m.label, icon: '⏰' });
  }

  // Day milestones
  for (const m of Milestones.dayMilestones) {
    offsets.push({ ms: m.value * MS_PER_DAY, label: m.label, icon: '📅' });
  }

  // Week milestones
  for (const m of Milestones.weekMilestones) {
    offsets.push({ ms: m.value * MS_PER_WEEK, label: m.label, icon: '📆' });
  }

  // Month milestones
  for (const m of Milestones.monthMilestones) {
    offsets.push({ ms: m.value * MS_PER_MONTH, label: m.label, icon: '🗓️' });
  }

  // Planetary years (first 5 years of each planet)
  for (const [, planet] of Object.entries(Milestones.PLANETS)) {
    for (let year = 1; year <= 5; year++) {
      offsets.push({
        ms: year * planet.days * MS_PER_DAY,
        label: `${planet.name} Year ${year}`,
        icon: planet.icon
      });
    }
  }

  // Fibonacci milestones (in seconds, for reasonable ages)
  for (const fib of Milestones.FIBONACCI) {
    const ms = fib * MS_PER_SECOND;
    // Only include if it's between 1 year and 120 years
    if (ms > MS_PER_YEAR && ms < 120 * MS_PER_YEAR) {
      offsets.push({ ms, label: `Fibonacci ${fib.toLocaleString()} seconds`, icon: '🐚' });
    }
  }

  // Earth birthdays (1-120 years)
  for (let year = 1; year <= 120; year++) {
    offsets.push({ ms: year * MS_PER_YEAR, label: `${year}${getOrdinal(year)} Birthday`, icon: '🎂' });
  }

  return offsets;
}

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return (s[(v - 20) % 10] || s[v] || s[0]);
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
    const { subscription, family, notificationTimes } = await request.json();

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

    // Upsert subscription
    await env.DB.prepare(`
      INSERT INTO subscriptions (id, endpoint, p256dh, auth, notification_times, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        endpoint = excluded.endpoint,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        notification_times = excluded.notification_times,
        updated_at = datetime('now')
    `).bind(
      subscriptionId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      times
    ).run();

    // Delete existing family members for this subscription
    await env.DB.prepare('DELETE FROM family_members WHERE subscription_id = ?')
      .bind(subscriptionId)
      .run();

    // Parse and insert family members
    if (family) {
      const members = parseFamilyParam(family);
      for (const member of members) {
        const birthDatetime = formatBirthDatetime(member.birthDate);
        await env.DB.prepare(`
          INSERT INTO family_members (subscription_id, name, birth_datetime)
          VALUES (?, ?, ?)
        `).bind(subscriptionId, member.name, birthDatetime).run();
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
 * Parse family parameter string into array of members
 */
function parseFamilyParam(familyParam) {
  try {
    return familyParam.split(',').map(m => {
      const parts = m.split('|');
      const name = decodeURIComponent(parts[0] || '');
      const dateStr = parts[1] || '';
      const timeStr = parts[2] || '00:00';
      const birthDate = new Date(`${dateStr}T${timeStr}:00`);
      return { name, birthDate };
    }).filter(m => m.name && !isNaN(m.birthDate.getTime()));
  } catch {
    return [];
  }
}

/**
 * Format birth date to YYYY-MM-DDTHH:MM for DB storage
 */
function formatBirthDatetime(date) {
  return date.toISOString().slice(0, 16); // "1990-05-15T14:30"
}

// ============================================================================
// SCHEDULED HANDLER - Birthday-indexed queries
// ============================================================================

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
  const currentMinute = now.toISOString().slice(0, 16); // "2024-01-15T10:30"
  console.log(`Checking notifications for ${currentMinute}`);

  const offsets = getMilestoneOffsets();
  const notificationTimes = [0, 60, 1440]; // At event, 1 hour before, 1 day before

  // Calculate all target birth datetimes
  const targetDatetimes = new Map(); // datetime -> [{offset, notifTime}]

  for (const offset of offsets) {
    for (const notifMinutes of notificationTimes) {
      // Target birth datetime = now - milestone_offset + notification_lead_time
      const targetMs = now.getTime() - offset.ms + (notifMinutes * 60 * 1000);
      const targetDate = new Date(targetMs);
      const targetDatetime = targetDate.toISOString().slice(0, 16);

      if (!targetDatetimes.has(targetDatetime)) {
        targetDatetimes.set(targetDatetime, []);
      }
      targetDatetimes.get(targetDatetime).push({
        offset,
        notifMinutes,
        eventTime: new Date(now.getTime() + notifMinutes * 60 * 1000)
      });
    }
  }

  console.log(`Checking ${targetDatetimes.size} unique birth datetimes`);

  // Query D1 with IN clause for all target datetimes
  const datetimeList = Array.from(targetDatetimes.keys());

  // D1 has a limit on query size, so batch if needed
  const BATCH_SIZE = 100;
  let totalNotifications = 0;

  for (let i = 0; i < datetimeList.length; i += BATCH_SIZE) {
    const batch = datetimeList.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');

    const result = await env.DB.prepare(`
      SELECT fm.name, fm.birth_datetime, s.id as subscription_id, s.endpoint, s.p256dh, s.auth, s.notification_times
      FROM family_members fm
      JOIN subscriptions s ON fm.subscription_id = s.id
      WHERE fm.birth_datetime IN (${placeholders})
    `).bind(...batch).all();

    if (result.results && result.results.length > 0) {
      // Group by subscription and send
      for (const row of result.results) {
        const milestones = targetDatetimes.get(row.birth_datetime) || [];

        for (const milestone of milestones) {
          // Check if this notification time is enabled for this subscription
          const times = JSON.parse(row.notification_times || '[1440,60,0]');
          if (!times.includes(milestone.notifMinutes)) continue;

          const { title, body } = generateNotificationContent(
            row.name,
            milestone.offset,
            milestone.notifMinutes
          );

          const subscription = {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth }
          };

          const success = await sendPushNotification(subscription, { title, body }, env);
          if (success) {
            totalNotifications++;
            console.log(`Sent: ${title} to ${row.name}`);
          }
        }
      }
    }
  }

  console.log(`Sent ${totalNotifications} notifications`);
}

/**
 * Generate notification content
 */
function generateNotificationContent(personName, offset, minutesBefore) {
  let title;
  const body = `${personName}: ${offset.label}`;

  if (minutesBefore === 0) {
    title = `${offset.icon} It's happening NOW!`;
  } else if (minutesBefore < 60) {
    title = `${offset.icon} ${minutesBefore} minutes away!`;
  } else if (minutesBefore < 1440) {
    const hours = Math.round(minutesBefore / 60);
    title = `${offset.icon} ${hours} hour${hours > 1 ? 's' : ''} away!`;
  } else {
    const days = Math.round(minutesBefore / 1440);
    title = `${offset.icon} ${days} day${days > 1 ? 's' : ''} away!`;
  }

  return { title, body };
}

// ============================================================================
// WEB PUSH IMPLEMENTATION
// ============================================================================

async function sendPushNotification(subscription, payload, env) {
  try {
    const vapidHeaders = await createVapidHeaders(subscription.endpoint, env);
    const encryptedPayload = await encryptPayload(
      JSON.stringify(payload),
      subscription.keys.p256dh,
      subscription.keys.auth
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'normal',
        ...vapidHeaders
      },
      body: encryptedPayload
    });

    if (response.status === 201 || response.status === 200) {
      return true;
    }

    if (response.status === 404 || response.status === 410) {
      console.log('Subscription expired, removing from DB');
      // Could delete from DB here
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

  const privateKeyRaw = base64urlDecode(privateKeyBase64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

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

  let allEvents = [];
  for (const member of members) {
    const events = Calculator.calculate(member.birthDate, {
      yearsAhead: 2,
      includePast: true,
      transformEvent: (event) => ({
        ...event,
        personName: member.name,
        title: `${member.name}: ${event.title}`
      })
    });
    allEvents = allEvents.concat(events);
  }

  allEvents.sort((a, b) => a.date - b.date);

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

function generateICal(events, isFamily = false) {
  const calName = isFamily ? 'Family Nerdiversaries' : 'Nerdiversaries';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nerdiversary//Nerdy Anniversaries//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  for (const event of events) {
    const dateStr = formatICalDate(event.date);
    const uid = `${event.id}@nerdiversary.com`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`DTEND:${dateStr}`);
    lines.push(`SUMMARY:${escapeICalText(event.title)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICalText(text) {
  return text.replace(/[\\;,\n]/g, (match) => {
    if (match === '\n') return '\\n';
    return '\\' + match;
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
