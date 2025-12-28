/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 *
 * Deployed via GitHub Actions
 */

// ============================================================================
// SHARED CONSTANTS - Keep in sync with js/nerdiversary.js
// ============================================================================

// Time constants
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000; // Gregorian calendar average
const MS_PER_MONTH = MS_PER_DAY * 30.4375;

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

// Fibonacci sequence
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025];

// Powers of 2 for binary milestones
const POWERS_OF_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// ============================================================================
// SHARED MILESTONES - Keep in sync with js/nerdiversary.js
// ============================================================================

const secondMilestones = [
  { value: 1e6, label: '1 Million Seconds', short: '10⁶ seconds' },
  { value: 1e7, label: '10 Million Seconds', short: '10⁷ seconds' },
  { value: 5e7, label: '50 Million Seconds', short: '5×10⁷ seconds' },
  { value: 1e8, label: '100 Million Seconds', short: '10⁸ seconds' },
  { value: 2.5e8, label: '250 Million Seconds', short: '2.5×10⁸ seconds' },
  { value: 5e8, label: '500 Million Seconds', short: '5×10⁸ seconds' },
  { value: 7.5e8, label: '750 Million Seconds', short: '7.5×10⁸ seconds' },
  { value: 1e9, label: '1 Billion Seconds', short: '10⁹ seconds' },
  { value: 1.5e9, label: '1.5 Billion Seconds', short: '1.5×10⁹ seconds' },
  { value: 2e9, label: '2 Billion Seconds', short: '2×10⁹ seconds' },
  { value: 2.5e9, label: '2.5 Billion Seconds', short: '2.5×10⁹ seconds' },
  { value: 3e9, label: '3 Billion Seconds', short: '3×10⁹ seconds' }
];

const minuteMilestones = [
  { value: 1e5, label: '100,000 Minutes', short: '10⁵ minutes' },
  { value: 1e6, label: '1 Million Minutes', short: '10⁶ minutes' },
  { value: 1e7, label: '10 Million Minutes', short: '10⁷ minutes' }
];

const hourMilestones = [
  { value: 1e4, label: '10,000 Hours', short: '10⁴ hours' },
  { value: 2.5e4, label: '25,000 Hours', short: '2.5×10⁴ hours' },
  { value: 5e4, label: '50,000 Hours', short: '5×10⁴ hours' },
  { value: 7.5e4, label: '75,000 Hours', short: '7.5×10⁴ hours' },
  { value: 1e5, label: '100,000 Hours', short: '10⁵ hours' },
  { value: 1.5e5, label: '150,000 Hours', short: '1.5×10⁵ hours' },
  { value: 2e5, label: '200,000 Hours', short: '2×10⁵ hours' },
  { value: 2.5e5, label: '250,000 Hours', short: '2.5×10⁵ hours' },
  { value: 3e5, label: '300,000 Hours', short: '3×10⁵ hours' },
  { value: 4e5, label: '400,000 Hours', short: '4×10⁵ hours' },
  { value: 5e5, label: '500,000 Hours', short: '5×10⁵ hours' },
  { value: 6e5, label: '600,000 Hours', short: '6×10⁵ hours' },
  { value: 7.5e5, label: '750,000 Hours', short: '7.5×10⁵ hours' },
  { value: 1e6, label: '1 Million Hours', short: '10⁶ hours' }
];

const dayMilestones = [
  { value: 1000, label: '1,000 Days', short: '10³ days' },
  { value: 1500, label: '1,500 Days', short: '1.5×10³ days' },
  { value: 2000, label: '2,000 Days', short: '2×10³ days' },
  { value: 2500, label: '2,500 Days', short: '2.5×10³ days' },
  { value: 3000, label: '3,000 Days', short: '3×10³ days' },
  { value: 4000, label: '4,000 Days', short: '4×10³ days' },
  { value: 5000, label: '5,000 Days', short: '5×10³ days' },
  { value: 6000, label: '6,000 Days', short: '6×10³ days' },
  { value: 7000, label: '7,000 Days', short: '7×10³ days' },
  { value: 7500, label: '7,500 Days', short: '7.5×10³ days' },
  { value: 8000, label: '8,000 Days', short: '8×10³ days' },
  { value: 9000, label: '9,000 Days', short: '9×10³ days' },
  { value: 10000, label: '10,000 Days', short: '10⁴ days' },
  { value: 11111, label: '11,111 Days', short: '11,111 days' },
  { value: 12345, label: '12,345 Days', short: '12,345 days' },
  { value: 15000, label: '15,000 Days', short: '1.5×10⁴ days' },
  { value: 17500, label: '17,500 Days', short: '1.75×10⁴ days' },
  { value: 20000, label: '20,000 Days', short: '2×10⁴ days' },
  { value: 22222, label: '22,222 Days', short: '22,222 days' },
  { value: 25000, label: '25,000 Days', short: '2.5×10⁴ days' },
  { value: 27500, label: '27,500 Days', short: '2.75×10⁴ days' },
  { value: 30000, label: '30,000 Days', short: '3×10⁴ days' },
  { value: 33333, label: '33,333 Days', short: '33,333 days' }
];

const weekMilestones = [
  { value: 250, label: '250 Weeks', short: '250 weeks' },
  { value: 500, label: '500 Weeks', short: '500 weeks' },
  { value: 750, label: '750 Weeks', short: '750 weeks' },
  { value: 1000, label: '1,000 Weeks', short: '10³ weeks' },
  { value: 1250, label: '1,250 Weeks', short: '1,250 weeks' },
  { value: 1500, label: '1,500 Weeks', short: '1,500 weeks' },
  { value: 1750, label: '1,750 Weeks', short: '1,750 weeks' },
  { value: 2000, label: '2,000 Weeks', short: '2×10³ weeks' },
  { value: 2500, label: '2,500 Weeks', short: '2,500 weeks' },
  { value: 3000, label: '3,000 Weeks', short: '3×10³ weeks' }
];

const monthMilestones = [
  { value: 100, label: '100 Months', short: '100 months' },
  { value: 200, label: '200 Months', short: '200 months' },
  { value: 250, label: '250 Months', short: '250 months' },
  { value: 300, label: '300 Months', short: '300 months' },
  { value: 400, label: '400 Months', short: '400 months' },
  { value: 500, label: '500 Months', short: '500 months' },
  { value: 600, label: '600 Months', short: '600 months' },
  { value: 750, label: '750 Months', short: '750 months' },
  { value: 1000, label: '1,000 Months', short: '10³ months' }
];

// ============================================================================
// WORKER HANDLER
// ============================================================================

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

// ============================================================================
// HELPERS
// ============================================================================

function getOrdinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ============================================================================
// EVENT CALCULATION
// ============================================================================

function calculateNerdiversaries(birthDate, yearsAhead) {
  const events = [];
  const now = new Date();
  const maxDate = new Date(birthDate.getTime() + yearsAhead * MS_PER_YEAR);

  // Planetary years
  for (const [key, planet] of Object.entries(PLANETS)) {
    const periodMs = planet.days * MS_PER_DAY;
    for (let yearNum = 1; yearNum <= 200; yearNum++) {
      const eventDate = new Date(birthDate.getTime() + yearNum * periodMs);
      if (eventDate > maxDate) break;
      if (eventDate < now) continue;

      events.push({
        id: `${key}-${yearNum}`,
        title: `${planet.icon} ${planet.name} Year ${yearNum}`,
        description: `You've completed ${yearNum} orbit${yearNum > 1 ? 's' : ''} around the Sun as measured from ${planet.name}!`,
        date: eventDate,
        category: 'planetary'
      });
    }
  }

  // Seconds milestones
  for (const m of secondMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `seconds-${m.value}`,
        title: `🔢 ${m.label}`,
        description: `You've been alive for exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Minutes milestones
  for (const m of minuteMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_MINUTE);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `minutes-${m.value}`,
        title: `⏱️ ${m.label}`,
        description: `You've experienced exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Hours milestones
  for (const m of hourMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `hours-${m.value}`,
        title: `⏰ ${m.label}`,
        description: `You've lived for exactly ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Days milestones
  for (const m of dayMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `days-${m.value}`,
        title: `📆 ${m.label}`,
        description: `You've experienced ${m.short} on Earth!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Weeks milestones
  for (const m of weekMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_WEEK);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `weeks-${m.value}`,
        title: `📅 ${m.label}`,
        description: `You've lived for ${m.short}!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Months milestones
  for (const m of monthMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * MS_PER_MONTH);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `months-${m.value}`,
        title: `🗓️ ${m.label}`,
        description: `You've experienced ${m.short} of life!`,
        date: eventDate,
        category: 'decimal'
      });
    }
  }

  // Binary milestones (powers of 2 in seconds)
  for (const power of POWERS_OF_2) {
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

  // Pop culture milestones
  const popCultureMilestones = [
    { value: 42e6, unit: MS_PER_SECOND, label: '42 Million Seconds', icon: '🌌', desc: 'The Answer to Life, the Universe, and Everything!' },
    { value: 1337, unit: MS_PER_DAY, label: '1,337 Days', icon: '🎮', desc: 'You are now officially 1337 (elite)!' },
  ];

  for (const m of popCultureMilestones) {
    const eventDate = new Date(birthDate.getTime() + m.value * m.unit);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `pop-${m.label.replace(/\s/g, '-')}`,
        title: `${m.icon} ${m.label}`,
        description: m.desc,
        date: eventDate,
        category: 'popculture'
      });
    }
  }

  // Nerdy holidays (Pi Day, May 4th, Tau Day)
  const nerdyHolidays = [
    { month: 2, day: 14, name: 'Pi Day', icon: '🥧', desc: 'March 14 (3.14)' },
    { month: 4, day: 4, name: 'May the 4th', icon: '⚔️', desc: 'Star Wars Day' },
    { month: 5, day: 28, name: 'Tau Day', icon: '🌀', desc: 'June 28 (τ ≈ 6.28)' }
  ];
  const maxYears = 120;

  for (const holiday of nerdyHolidays) {
    for (let year = 1; year <= maxYears; year++) {
      const holidayDate = new Date(
        birthDate.getFullYear() + year,
        holiday.month,
        holiday.day,
        birthDate.getHours(),
        birthDate.getMinutes()
      );
      if (holidayDate > birthDate && holidayDate <= maxDate && holidayDate > now) {
        const ordinal = getOrdinal(year);
        events.push({
          id: `${holiday.name.toLowerCase().replace(/\s/g, '-')}-${year}`,
          title: `${holiday.icon} ${ordinal} ${holiday.name}`,
          description: `Your ${ordinal} ${holiday.name}! (${holiday.desc})`,
          date: holidayDate,
          category: 'popculture'
        });
      }
    }
  }

  // Earth birthdays
  const maxBirthdayYears = 120;
  for (let year = 1; year <= maxBirthdayYears; year++) {
    const birthdayDate = new Date(
      birthDate.getFullYear() + year,
      birthDate.getMonth(),
      birthDate.getDate(),
      birthDate.getHours(),
      birthDate.getMinutes()
    );
    if (birthdayDate > birthDate && birthdayDate <= maxDate && birthdayDate > now) {
      const ordinal = getOrdinal(year);
      events.push({
        id: `earth-birthday-${year}`,
        title: `🎂 ${ordinal} Birthday`,
        description: `Happy ${ordinal} birthday on Earth!`,
        date: birthdayDate,
        category: 'planetary'
      });
    }
  }

  // Sort by date
  events.sort((a, b) => a.date - b.date);

  return events;
}

// ============================================================================
// ICAL GENERATION
// ============================================================================

function generateICal(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nerdiversary//Nerdy Anniversaries//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Nerdiversaries',
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
