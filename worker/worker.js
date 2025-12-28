/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 *
 * Deployed via GitHub Actions
 */

// Time constants
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

// Planetary orbital periods in Earth days
const PLANETS = {
  mercury: { name: 'Mercury', days: 87.969, icon: '☿️' },
  venus: { name: 'Venus', days: 224.701, icon: '♀️' },
  mars: { name: 'Mars', days: 686.980, icon: '♂️' },
  jupiter: { name: 'Jupiter', days: 4332.59, icon: '♃' },
  saturn: { name: 'Saturn', days: 10759.22, icon: '♄' },
  uranus: { name: 'Uranus', days: 30688.5, icon: '⛢' },
  neptune: { name: 'Neptune', days: 60182, icon: '♆' }
};

// Mathematical constants
const PI = Math.PI;
const E = Math.E;
const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = 2 * Math.PI;

// Fibonacci sequence
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025];

export default {
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

    // Get birthday from query params
    const birthday = url.searchParams.get('d') || url.searchParams.get('birthday');
    const birthtime = url.searchParams.get('t') || url.searchParams.get('time') || '00:00';

    if (!birthday) {
      return new Response(JSON.stringify({
        error: 'Missing birthday parameter',
        usage: 'Add ?d=YYYY-MM-DD or ?birthday=YYYY-MM-DD to the URL',
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

    // Generate events
    const events = calculateNerdiversaries(birthDate, 120); // 120 years of events

    // Generate iCal content
    const icalContent = generateICal(events);

    // Return .ics file
    return new Response(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="nerdiversaries.ics"',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  },
};

function calculateNerdiversaries(birthDate, yearsAhead) {
  const events = [];
  const now = new Date();
  const maxDate = new Date(birthDate.getTime() + yearsAhead * MS_PER_YEAR);

  // Planetary years
  for (const [key, planet] of Object.entries(PLANETS)) {
    const periodMs = planet.days * MS_PER_DAY;
    for (let yearNum = 1; yearNum <= 100; yearNum++) {
      const eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
      if (eventDate > maxDate) break;
      if (eventDate < now) continue; // Skip past events for subscriptions

      events.push({
        id: `${key}-${yearNum}`,
        title: `${planet.icon} ${planet.name} Year ${yearNum}`,
        description: `You've completed ${yearNum} orbit${yearNum > 1 ? 's' : ''} around the Sun as measured from ${planet.name}!`,
        date: eventDate,
        category: 'planetary'
      });
    }
  }

  // Decimal milestones
  const MS_PER_MONTH = MS_PER_DAY * 30.4375;
  const decimalMilestones = [
    // Seconds
    { value: 5e8, unit: MS_PER_SECOND, label: '500 Million Seconds', icon: '🔢' },
    { value: 7.5e8, unit: MS_PER_SECOND, label: '750 Million Seconds', icon: '🔢' },
    { value: 1e9, unit: MS_PER_SECOND, label: '1 Billion Seconds', icon: '🔢' },
    { value: 1.5e9, unit: MS_PER_SECOND, label: '1.5 Billion Seconds', icon: '🔢' },
    { value: 2e9, unit: MS_PER_SECOND, label: '2 Billion Seconds', icon: '🔢' },
    { value: 2.5e9, unit: MS_PER_SECOND, label: '2.5 Billion Seconds', icon: '🔢' },
    { value: 3e9, unit: MS_PER_SECOND, label: '3 Billion Seconds', icon: '🔢' },
    // Minutes
    { value: 1e6, unit: MS_PER_MINUTE, label: '1 Million Minutes', icon: '⏱️' },
    { value: 1e7, unit: MS_PER_MINUTE, label: '10 Million Minutes', icon: '⏱️' },
    // Hours
    { value: 1e5, unit: MS_PER_HOUR, label: '100,000 Hours', icon: '⏰' },
    { value: 2e5, unit: MS_PER_HOUR, label: '200,000 Hours', icon: '⏰' },
    { value: 3e5, unit: MS_PER_HOUR, label: '300,000 Hours', icon: '⏰' },
    { value: 5e5, unit: MS_PER_HOUR, label: '500,000 Hours', icon: '⏰' },
    { value: 7.5e5, unit: MS_PER_HOUR, label: '750,000 Hours', icon: '⏰' },
    { value: 1e6, unit: MS_PER_HOUR, label: '1 Million Hours', icon: '⏰' },
    // Days
    { value: 5000, unit: MS_PER_DAY, label: '5,000 Days', icon: '📆' },
    { value: 7500, unit: MS_PER_DAY, label: '7,500 Days', icon: '📆' },
    { value: 10000, unit: MS_PER_DAY, label: '10,000 Days', icon: '📆' },
    { value: 12345, unit: MS_PER_DAY, label: '12,345 Days', icon: '📆' },
    { value: 15000, unit: MS_PER_DAY, label: '15,000 Days', icon: '📆' },
    { value: 20000, unit: MS_PER_DAY, label: '20,000 Days', icon: '📆' },
    { value: 25000, unit: MS_PER_DAY, label: '25,000 Days', icon: '📆' },
    { value: 30000, unit: MS_PER_DAY, label: '30,000 Days', icon: '📆' },
    // Weeks
    { value: 1000, unit: MS_PER_WEEK, label: '1,000 Weeks', icon: '📅' },
    { value: 1500, unit: MS_PER_WEEK, label: '1,500 Weeks', icon: '📅' },
    { value: 2000, unit: MS_PER_WEEK, label: '2,000 Weeks', icon: '📅' },
    { value: 2500, unit: MS_PER_WEEK, label: '2,500 Weeks', icon: '📅' },
    { value: 3000, unit: MS_PER_WEEK, label: '3,000 Weeks', icon: '📅' },
    // Months
    { value: 500, unit: MS_PER_MONTH, label: '500 Months', icon: '🗓️' },
    { value: 600, unit: MS_PER_MONTH, label: '600 Months', icon: '🗓️' },
    { value: 750, unit: MS_PER_MONTH, label: '750 Months', icon: '🗓️' },
    { value: 1000, unit: MS_PER_MONTH, label: '1,000 Months', icon: '🗓️' },
  ];

  for (const m of decimalMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * m.unit);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `decimal-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: `You've been alive for exactly ${m.label}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Binary milestones
  const binaryPowers = [25, 26, 27, 28, 29, 30, 31, 32];
  for (const power of binaryPowers) {
    const value = Math.pow(2, power);
    const eventDate = new Date(birthDate.getTime() + value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `binary-${power}`,
        title: `💻 2^${power} Seconds`,
        description: `You've lived for exactly 2^${power} = ${value.toLocaleString()} seconds!`,
        date: eventDate,
        category: 'binary'
      });
    }
  }

  // Mathematical constants
  const mathMilestones = [
    { value: PI * 1e8, label: 'π × 10⁸ Seconds', icon: 'π' },
    { value: PI * 1e9, label: 'π × 10⁹ Seconds', icon: 'π' },
    { value: E * 1e8, label: 'e × 10⁸ Seconds', icon: 'e' },
    { value: E * 1e9, label: 'e × 10⁹ Seconds', icon: 'e' },
    { value: PHI * 1e8, label: 'φ × 10⁸ Seconds', icon: 'φ' },
    { value: PHI * 1e9, label: 'φ × 10⁹ Seconds', icon: 'φ' },
  ];

  for (const m of mathMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `math-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: `You've lived for ${m.label}!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Fibonacci milestones (days)
  for (const fib of FIBONACCI.filter(n => n >= 1000)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-${fib}`,
        title: `🌀 Fibonacci Day ${fib.toLocaleString()}`,
        description: `Day ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Pop culture
  const popCulture = [
    { value: 42e6, unit: MS_PER_SECOND, label: '42 Million Seconds', icon: '🌌', desc: 'The Answer to Life, the Universe, and Everything!' },
    { value: 1337, unit: MS_PER_DAY, label: '1,337 Days', icon: '🎮', desc: 'You are now officially 1337 (elite)!' },
  ];

  for (const m of popCulture) {
    const eventDate = new Date(birthDate.getTime() + m.value * m.unit);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `pop-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: m.desc,
        date: eventDate,
        category: 'pop-culture'
      });
    }
  }

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events;
}

function generateICal(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nerdiversary//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:My Nerdiversaries',
    'X-WR-CALDESC:Nerdy anniversary milestones',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    'X-PUBLISHED-TTL:P1D',
  ];

  for (const event of events) {
    const uid = `${event.id}@nerdiversary.app`;
    const dtstamp = formatICalDate(new Date());
    const dtstart = formatICalDate(event.date);
    const dtend = formatICalDate(new Date(event.date.getTime() + MS_PER_HOUR));

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeICalText(event.title)}`,
      `DESCRIPTION:${escapeICalText(event.description)}`,
      `CATEGORIES:Nerdiversary`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Tomorrow: ${escapeICalText(event.title)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeICalText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
