/**
 * Nerdiversary Cloudflare Worker
 * Generates .ics calendar files for nerdiversary events
 *
 * Deployed via GitHub Actions
 */

// Import shared constants from milestones module
// Wrangler's bundler (esbuild) handles CommonJS -> ESM conversion
import Milestones from '../js/milestones.js';

const {
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MS_PER_WEEK,
  MS_PER_YEAR,
  MS_PER_MONTH,
  PLANETS,
  PI,
  E,
  PHI,
  TAU,
  FIBONACCI,
  LUCAS,
  TRIANGULAR,
  PALINDROMES,
  REPUNITS,
  POWERS_OF_2,
  secondMilestones,
  minuteMilestones,
  hourMilestones,
  dayMilestones,
  weekMilestones,
  monthMilestones,
  baseMilestones,
  popCultureMilestones,
  nerdyHolidays,
  primeAges,
  squareAges,
  powerOf2Ages,
  cubeAges,
  hexRoundAges,
  getOrdinal
} = Milestones;

// ============================================================================
// WORKER HANDLER
// ============================================================================

// Cloudflare Workers export
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

// ES module export for Cloudflare Workers
export default workerHandler;

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

  // All number base milestones (using shared baseMilestones from milestones.js)
  for (const { base, name, icon, units } of baseMilestones) {
    for (const { powers, unit, label, ms } of units) {
      for (const power of powers) {
        const value = Math.pow(base, power);
        const eventDate = new Date(birthDate.getTime() + value * ms);
        if (eventDate <= maxDate && eventDate > now && eventDate > birthDate) {
          events.push({
            id: `base${base}-${power}-${unit}`,
            title: `${icon} ${base}^${power} ${label}`,
            description: `You've lived for ${base}^${power} = ${value.toLocaleString()} ${unit} (${name})!`,
            date: eventDate,
            category: 'binary'
          });
        }
      }
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

  // Fibonacci milestones (seconds - larger ones spanning lifetime)
  for (const fib of FIBONACCI.filter(n => n >= 1e6 && n <= 3e9)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-seconds-${fib}`,
        title: `🌀 Fibonacci Second ${fib.toLocaleString()}`,
        description: `Second ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (minutes)
  for (const fib of FIBONACCI.filter(n => n >= 1e5 && n <= 5e7)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_MINUTE);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-minutes-${fib}`,
        title: `🌀 Fibonacci Minute ${fib.toLocaleString()}`,
        description: `Minute ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (hours)
  for (const fib of FIBONACCI.filter(n => n >= 10000 && n <= 1000000)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-hours-${fib}`,
        title: `🌀 Fibonacci Hour ${fib.toLocaleString()}`,
        description: `Hour ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Fibonacci milestones (days)
  for (const fib of FIBONACCI.filter(n => n >= 100 && n <= 40000)) {
    const eventDate = new Date(birthDate.getTime() + fib * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `fib-days-${fib}`,
        title: `🌀 Fibonacci Day ${fib.toLocaleString()}`,
        description: `Day ${fib.toLocaleString()} is a Fibonacci number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Lucas number milestones (days)
  for (const luc of LUCAS.filter(n => n >= 100 && n <= 40000)) {
    const eventDate = new Date(birthDate.getTime() + luc * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `lucas-days-${luc}`,
        title: `🔢 Lucas Day ${luc.toLocaleString()}`,
        description: `Day ${luc.toLocaleString()} is a Lucas number!`,
        date: eventDate,
        category: 'fibonacci'
      });
    }
  }

  // Triangular number milestones (days)
  const interestingTriangular = TRIANGULAR.filter(n => n >= 1000 && n <= 35000);
  for (const tri of interestingTriangular) {
    const eventDate = new Date(birthDate.getTime() + tri * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      const n = Math.round((-1 + Math.sqrt(1 + 8 * tri)) / 2);
      events.push({
        id: `triangular-days-${tri}`,
        title: `🔺 Triangular Day ${tri.toLocaleString()}`,
        description: `Day ${tri.toLocaleString()} is the ${n}th triangular number (1+2+...+${n})!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Palindrome milestones (days)
  const interestingPalindromes = PALINDROMES.filter(n => n >= 1000 && n <= 30000);
  for (const pal of interestingPalindromes) {
    const eventDate = new Date(birthDate.getTime() + pal * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `palindrome-days-${pal}`,
        title: `🪞 Palindrome Day ${pal.toLocaleString()}`,
        description: `Day ${pal} reads the same forwards and backwards!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Palindrome hours
  const palindromeHours = [10001, 10101, 10201, 11011, 11111, 11211, 12021, 12121, 12221, 12321];
  for (const pal of palindromeHours) {
    const eventDate = new Date(birthDate.getTime() + pal * MS_PER_HOUR);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `palindrome-hours-${pal}`,
        title: `🪞 Palindrome Hour ${pal.toLocaleString()}`,
        description: `Hour ${pal.toLocaleString()} is a palindrome!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Repunit milestones (days)
  for (const rep of REPUNITS.filter(n => n >= 111 && n <= 30000)) {
    const eventDate = new Date(birthDate.getTime() + rep * MS_PER_DAY);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `repunit-days-${rep}`,
        title: `1️⃣ Repunit Day ${rep.toLocaleString()}`,
        description: `Day ${rep} is all 1s - a repunit number!`,
        date: eventDate,
        category: 'binary'
      });
    }
  }

  // Scientific milestones
  // Speed of light: 299,792,458 m/s
  const speedOfLight = 299792458;
  const solEvent = new Date(birthDate.getTime() + speedOfLight * MS_PER_SECOND);
  if (solEvent <= maxDate && solEvent > now) {
    events.push({
      id: 'speed-of-light-seconds',
      title: `💡 Speed of Light Seconds`,
      description: `You've lived for ${speedOfLight.toLocaleString()} seconds - the speed of light in m/s!`,
      date: solEvent,
      category: 'mathematical'
    });
  }

  // Euler's identity related: e^π ≈ 23.14
  const ePi = Math.pow(Math.E, Math.PI);
  for (const [mult, label] of [[1e6, 'Million'], [1e7, '10 Million'], [1e8, '100 Million']]) {
    const eventDate = new Date(birthDate.getTime() + ePi * mult * MS_PER_SECOND);
    if (eventDate <= maxDate && eventDate > now) {
      events.push({
        id: `e-pi-${mult}`,
        title: `🧮 e^π × ${label} Seconds`,
        description: `You've lived for e^π × ${mult.toLocaleString()} ≈ ${Math.floor(ePi * mult).toLocaleString()} seconds!`,
        date: eventDate,
        category: 'mathematical'
      });
    }
  }

  // Pop culture milestones (using shared popCultureMilestones from milestones.js)
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

  // Nerdy holidays (using shared nerdyHolidays from milestones.js)
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

  // Earth birthdays with special labels (using shared arrays from milestones.js)
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

      // Build special labels
      const labels = [];
      if (year === 42) labels.push('The Answer!');
      if (primeAges.has(year)) labels.push('Prime');
      if (squareAges[year]) labels.push(`Perfect Square (${squareAges[year]})`);
      if (powerOf2Ages[year]) labels.push(`Power of 2 (${powerOf2Ages[year]})`);
      if (cubeAges[year]) labels.push(`Perfect Cube (${cubeAges[year]})`);
      if (hexRoundAges[year]) labels.push(`Hex Round (${hexRoundAges[year]})`);

      const specialLabel = labels.length > 0 ? ` — ${labels.join(', ')}` : '';

      events.push({
        id: `earth-birthday-${year}`,
        title: `🎂 ${ordinal} Birthday`,
        description: `Happy ${ordinal} birthday on Earth!${specialLabel}`,
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

