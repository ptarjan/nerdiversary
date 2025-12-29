/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 *
 * Deployed via GitHub Actions
 */

// Import shared modules
// Wrangler's bundler (esbuild) handles CommonJS -> ESM conversion
import Milestones from '../js/milestones.js';
import Calculator from '../js/calculator.js';

// ============================================================================
// WORKER HANDLER
// ============================================================================

const workerHandler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Check for family format first
    const familyParam = url.searchParams.get('family');
    if (familyParam) {
      return handleFamilyRequest(url, familyParam);
    }

    // Legacy single-person format
    const birthday = url.searchParams.get('d') || url.searchParams.get('birthday');
    const birthtime = url.searchParams.get('t') || url.searchParams.get('time') || '00:00';

    if (!birthday) {
      return new Response(JSON.stringify({
        error: 'Missing birthday parameter',
        usage: 'Add ?d=YYYY-MM-DD or ?family=Name|YYYY-MM-DD,Name2|YYYY-MM-DD',
        example: url.origin + '/?d=1990-05-15'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse birth date
    const birthDate = new Date(`${birthday}T${birthtime}:00`);

    if (isNaN(birthDate.getTime())) {
      return new Response(JSON.stringify({
        error: 'Invalid date format',
        expected: 'YYYY-MM-DD',
        received: birthday
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate events using shared calculator
    // Transform events to add icon to title for calendar display
    const events = Calculator.calculate(birthDate, {
      yearsAhead: 120,
      includePast: false,
      transformEvent: (event) => ({
        ...event,
        title: `${event.icon} ${event.title}`
      })
    });

    // Generate iCal content
    const icalContent = generateICal(events, false);

    // Return .ics file
    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="nerdiversaries.ics"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};

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
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Generate events for all family members
    let allEvents = [];

    for (const member of members) {
      const events = Calculator.calculate(member.birthDate, {
        yearsAhead: 120,
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
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
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
        'Access-Control-Allow-Origin': '*',
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

function escapeICalText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
