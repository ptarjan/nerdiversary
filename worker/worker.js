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
    const { subscription, family } = await request.json();

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

    // Store subscription in KV with family data
    // Key is a hash of the endpoint to ensure uniqueness
    const key = await hashEndpoint(subscription.endpoint);
    await env.PUSH_SUBSCRIPTIONS.put(key, JSON.stringify({
      subscription,
      family,
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

// ES module export for Cloudflare Workers
export default workerHandler;

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
