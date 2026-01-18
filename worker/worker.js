/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 * Handles push notification subscriptions
 *
 * Deployed via GitHub Actions
 */

// Import shared modules
// Wrangler's bundler (esbuild) handles CommonJS -> ESM conversion
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
// PUSH NOTIFICATION HANDLERS
// Note: To enable full push notifications, add these to wrangler.toml:
// - KV namespace binding: PUSH_SUBSCRIPTIONS
// - Environment variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// - Scheduled trigger for sending notifications
// ============================================================================

/**
 * Return VAPID public key for push subscription
 */
function handleVapidPublicKey(env) {
  // VAPID public key should be set as environment variable
  const publicKey = env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return new Response(JSON.stringify({
      error: 'Push notifications not configured',
      message: 'VAPID keys not set up on server'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }

  return new Response(JSON.stringify({ publicKey }), {
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Handle push subscription
 */
async function handlePushSubscribe(request, env) {
  // Check if KV storage is configured
  if (!env.PUSH_SUBSCRIPTIONS) {
    return new Response(JSON.stringify({
      error: 'Push notifications not configured',
      message: 'KV storage not set up'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
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
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }

    // Store subscription in KV with family data and notification times
    // Key is a hash of the endpoint to ensure uniqueness
    const key = await hashEndpoint(subscription.endpoint);
    await env.PUSH_SUBSCRIPTIONS.put(key, JSON.stringify({
      subscription,
      family,
      notificationTimes: notificationTimes || [1440, 60, 0], // Default: 1 day, 1 hour, at event
      createdAt: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Failed to save subscription',
      message: e.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * Handle push unsubscription
 */
async function handlePushUnsubscribe(request, env) {
  if (!env.PUSH_SUBSCRIPTIONS) {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }

  try {
    const { endpoint } = await request.json();

    if (endpoint) {
      const key = await hashEndpoint(endpoint);
      await env.PUSH_SUBSCRIPTIONS.delete(key);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  } catch {
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

/**
 * Hash endpoint URL for use as KV key
 */
async function hashEndpoint(endpoint) {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Handle family calendar request with multiple people
 */
function handleFamilyRequest(url, familyParam) {
  try {
    // Parse family members: Name|YYYY-MM-DD|HH:MM,Name2|YYYY-MM-DD
    const members = familyParam.split(',').map(m => {
      const parts = m.split('|');
      const name = decodeURIComponent(parts[0] || '');
      const dateStr = parts[1] || '';
      const timeStr = parts[2] || '00:00';
      const birthDate = new Date(`${dateStr}T${timeStr}:00`);

      return { name, birthDate };
    }).filter(m => m.name && !isNaN(m.birthDate.getTime()));

    if (members.length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid family members found',
        usage: '?family=Name|YYYY-MM-DD,Name2|YYYY-MM-DD',
        example: url.origin + '/?family=Alice|1990-05-15,Bob|1988-03-22'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    }

    // Generate events for all family members
    let allEvents = [];

    for (const member of members) {
      const events = Calculator.calculate(member.birthDate, {
        yearsAhead: Milestones.MAX_YEARS,
        includePast: false,
        transformEvent: (event) => ({
          ...event,
          personName: member.name,
          title: `${event.icon} ${member.name}: ${event.title}`,
          id: `${member.name}-${event.id}`
        })
      });

      allEvents = allEvents.concat(events);
    }

    // Sort by date
    allEvents.sort((a, b) => a.date - b.date);

    // Generate iCal content
    const icalContent = generateICal(allEvents, true);

    // Return .ics file
    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="family-nerdiversaries.ics"',
        'Cache-Control': 'public, max-age=3600',
        ...CORS_HEADERS,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Failed to parse family parameter',
      message: e.message
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    });
  }
}

// ============================================================================
// SCHEDULED HANDLER - Push Notification Sender
// ============================================================================

/**
 * Scheduled handler - runs on cron trigger to send push notifications
 * Checks all subscriptions for events that need notifications
 */
async function handleScheduled(env) {
  // Check if push notifications are configured
  if (!env.PUSH_SUBSCRIPTIONS || !env.SENT_NOTIFICATIONS || !env.VAPID_PRIVATE_KEY) {
    console.log('Push notifications not configured - skipping scheduled run');
    return;
  }

  const now = new Date();
  console.log(`Running scheduled notification check at ${now.toISOString()}`);

  // List all subscriptions from KV
  const subscriptions = await listAllSubscriptions(env);
  console.log(`Found ${subscriptions.length} subscriptions`);

  let sentCount = 0;
  let errorCount = 0;

  for (const { key, data } of subscriptions) {
    try {
      const sent = await processSubscription(key, data, now, env);
      sentCount += sent;
    } catch (error) {
      console.error(`Error processing subscription ${key}:`, error);
      errorCount++;
    }
  }

  console.log(`Scheduled run complete: ${sentCount} notifications sent, ${errorCount} errors`);
}

/**
 * List all subscriptions from KV storage
 */
async function listAllSubscriptions(env) {
  const subscriptions = [];
  let cursor = null;

  do {
    const result = await env.PUSH_SUBSCRIPTIONS.list({ cursor, limit: 100 });

    for (const key of result.keys) {
      const data = await env.PUSH_SUBSCRIPTIONS.get(key.name, { type: 'json' });
      if (data) {
        subscriptions.push({ key: key.name, data });
      }
    }

    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);

  return subscriptions;
}

/**
 * Process a single subscription and send any due notifications
 */
async function processSubscription(key, subscriptionData, now, env) {
  const { subscription, family, notificationTimes } = subscriptionData;

  if (!family || !subscription) {
    return 0;
  }

  // Parse family members
  const members = parseFamilyParam(family);
  if (members.length === 0) {
    return 0;
  }

  // Default notification times: 1 day, 1 hour, at event time
  const times = notificationTimes || [1440, 60, 0];

  // Calculate upcoming events for all family members
  let allEvents = [];
  for (const member of members) {
    const events = Calculator.calculate(member.birthDate, {
      yearsAhead: 1, // Only check next year for performance
      includePast: false,
      transformEvent: (event) => ({
        ...event,
        personName: member.name,
        title: `${member.name}: ${event.title}`
      })
    });
    allEvents = allEvents.concat(events);
  }

  let sentCount = 0;

  // Check each event against notification times
  for (const event of allEvents) {
    for (const minutesBefore of times) {
      const notificationTime = new Date(event.date.getTime() - minutesBefore * 60 * 1000);

      // Check if this notification is due (within the last 20 minutes window)
      const timeDiff = now.getTime() - notificationTime.getTime();
      if (timeDiff >= 0 && timeDiff < 20 * 60 * 1000) { // Due and within 20 min window

        // Generate unique notification ID
        const notificationId = `${key}-${event.id}-${minutesBefore}`;

        // Check if already sent
        const alreadySent = await env.SENT_NOTIFICATIONS.get(notificationId);
        if (alreadySent) {
          continue;
        }

        // Generate notification content
        const { title, body } = generateNotificationContent(event, minutesBefore);

        // Send push notification
        const success = await sendPushNotification(subscription, { title, body, data: { eventId: event.id } }, env);

        if (success) {
          // Mark as sent with 7-day expiration
          await env.SENT_NOTIFICATIONS.put(notificationId, 'sent', { expirationTtl: 7 * 24 * 60 * 60 });
          sentCount++;
          console.log(`Sent notification: ${title}`);
        }
      }
    }
  }

  return sentCount;
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
 * Generate notification content based on event and timing
 */
function generateNotificationContent(event, minutesBefore) {
  let title;
  let body = event.title;

  if (minutesBefore === 0) {
    title = `${event.icon} It's happening NOW!`;
  } else if (minutesBefore < 60) {
    title = `${event.icon} ${minutesBefore} minutes away!`;
  } else if (minutesBefore < 1440) {
    const hours = Math.round(minutesBefore / 60);
    title = `${event.icon} ${hours} hour${hours > 1 ? 's' : ''} away!`;
  } else {
    const days = Math.round(minutesBefore / 1440);
    title = `${event.icon} ${days} day${days > 1 ? 's' : ''} away!`;
  }

  return { title, body };
}

// ============================================================================
// WEB PUSH IMPLEMENTATION
// ============================================================================

/**
 * Send a push notification using the Web Push protocol
 */
async function sendPushNotification(subscription, payload, env) {
  try {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;

    // Create VAPID JWT
    const vapidHeaders = await createVapidHeaders(endpoint, env);

    // Encrypt the payload
    const encryptedPayload = await encryptPayload(JSON.stringify(payload), p256dh, auth);

    // Send the push notification
    const response = await fetch(endpoint, {
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

    // Handle subscription expiry
    if (response.status === 404 || response.status === 410) {
      console.log('Subscription expired, should remove from KV');
      return false;
    }

    console.error(`Push failed with status ${response.status}: ${await response.text()}`);
    return false;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

/**
 * Create VAPID Authorization headers
 */
async function createVapidHeaders(endpoint, env) {
  const vapidSubject = env.VAPID_SUBJECT || 'mailto:nerdiversary@example.com';
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;

  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Create JWT
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: vapidSubject
  };

  const jwt = await signJWT(header, payload, privateKey);

  return {
    'Authorization': `vapid t=${jwt}, k=${publicKey}`
  };
}

/**
 * Sign a JWT using ES256 (ECDSA with P-256 and SHA-256)
 */
async function signJWT(header, payload, privateKeyBase64) {
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyRaw = base64urlDecode(privateKeyBase64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert signature from DER to raw format if needed, then base64url encode
  const signatureB64 = base64urlEncode(new Uint8Array(signature));

  return `${unsignedToken}.${signatureB64}`;
}

/**
 * Encrypt payload using aes128gcm content encoding
 */
async function encryptPayload(payload, p256dhBase64, authBase64) {
  // Decode subscription keys
  const p256dh = base64urlDecode(p256dhBase64);
  const auth = base64urlDecode(authBase64);

  // Generate local key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export local public key
  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKey);

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Derive shared secret using ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key using HKDF
  const ikm = await deriveIKM(new Uint8Array(sharedSecret), auth, localPublicKeyBytes, p256dh);
  const contentEncryptionKey = await deriveKey(ikm, salt, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = await deriveKey(ikm, salt, 'Content-Encoding: nonce\0', 12);

  // Pad and encode payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Delimiter
  paddedPayload[payloadBytes.length + 1] = 0; // Padding

  // Encrypt with AES-GCM
  const encryptionKey = await crypto.subtle.importKey(
    'raw',
    contentEncryptionKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    encryptionKey,
    paddedPayload
  );

  // Build the aes128gcm header
  // Format: salt (16) + record size (4) + key id length (1) + key id (65 for P-256 public key)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, encrypted.byteLength + 86, false); // header + ciphertext

  const header = new Uint8Array(86);
  header.set(salt, 0); // salt
  header.set(recordSize, 16); // record size
  header[20] = 65; // key id length
  header.set(localPublicKeyBytes, 21); // local public key

  // Combine header and encrypted content
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

/**
 * Derive IKM (Input Keying Material) for HKDF
 */
async function deriveIKM(sharedSecret, auth, localPublicKey, subscriberPublicKey) {
  // Import shared secret for HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  // Create info for auth secret derivation
  // "WebPush: info\0" + subscriber_public_key + local_public_key
  const infoPrefix = new TextEncoder().encode('WebPush: info\0');
  const info = new Uint8Array(infoPrefix.length + subscriberPublicKey.length + localPublicKey.length);
  info.set(infoPrefix, 0);
  info.set(subscriberPublicKey, infoPrefix.length);
  info.set(localPublicKey, infoPrefix.length + subscriberPublicKey.length);

  // Derive IKM using HKDF with auth as salt
  const ikm = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: auth, info },
    sharedSecretKey,
    256
  );

  return new Uint8Array(ikm);
}

/**
 * Derive a key using HKDF
 */
async function deriveKey(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const infoBytes = new TextEncoder().encode(info);
  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: infoBytes },
    key,
    length * 8
  );

  return new Uint8Array(derived);
}

/**
 * Base64url encode
 */
function base64urlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64url decode
 */
function base64urlDecode(input) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const decoded = atob(base64 + padding);
  return new Uint8Array([...decoded].map(c => c.charCodeAt(0)));
}

// ES module export for Cloudflare Workers
const workerExport = {
  ...workerHandler,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  }
};

export default workerExport;

// ============================================================================
// ICAL GENERATION
// ============================================================================

function generateICal(events, isFamily = false) {
  const calName = isFamily ? 'Family Nerdiversaries' : 'Nerdiversaries';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nerdiversary//Nerdy Anniversaries//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-CALDESC:Your nerdy anniversary milestones',
  ];

  for (const event of events) {
    const dateStr = formatICalDate(event.date);
    const uid = `${event.id}@nerdiversary.com`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`DTEND:${dateStr}`);
    lines.push(`SUMMARY:${escapeICalText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    lines.push(`CATEGORIES:${event.category}`);
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Tomorrow: ${escapeICalText(event.title)}`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, '');
}

function escapeICalText(text) {
  return stripHtml(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
